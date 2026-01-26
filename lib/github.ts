import { Octokit } from "@octokit/rest";
import { getKSTDayRange } from "@/lib/date-utils";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = "studiobaton";

export interface CommitFileData {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface CommitData {
  sha: string;
  repository: string;
  message: string;
  author: string;
  authorEmail: string | null;
  authorAvatar: string | null;
  committedAt: Date;
  additions: number;
  deletions: number;
  filesChanged: number;
  url: string;
  files: CommitFileData[];
}

export async function getOrgRepos(): Promise<string[]> {
  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: ORG_NAME,
      type: "all",
      per_page: 100,
    });
    return repos.map((repo) => repo.name);
  } catch (error) {
    console.error("Error fetching org repos:", error);
    return [];
  }
}

/**
 * 레포지토리의 모든 브랜치 목록 조회
 */
export async function getRepoBranches(repo: string): Promise<string[]> {
  try {
    const branches = await octokit.paginate(octokit.repos.listBranches, {
      owner: ORG_NAME,
      repo,
      per_page: 100,
    });
    return branches.map((branch) => branch.name);
  } catch (error) {
    console.error(`Error fetching branches for ${repo}:`, error);
    return [];
  }
}

// 병렬 처리 배치 크기 (GitHub API rate limit 고려)
const BATCH_SIZE = 10;

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = BATCH_SIZE
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

export async function getCommitsSince(
  repo: string,
  since: Date,
  until: Date
): Promise<CommitData[]> {
  try {
    // 모든 브랜치 목록 조회
    const branches = await getRepoBranches(repo);

    if (branches.length === 0) {
      return [];
    }

    // 각 브랜치별로 커밋 조회 (병렬 처리)
    const branchCommitsResults = await processBatch(
      branches,
      async (branch) => {
        try {
          return await octokit.paginate(octokit.repos.listCommits, {
            owner: ORG_NAME,
            repo,
            sha: branch, // 브랜치 지정
            since: since.toISOString(),
            until: until.toISOString(),
            per_page: 100,
          });
        } catch (error) {
          console.error(`Error fetching commits for ${repo}/${branch}:`, error);
          return [];
        }
      },
      5
    );

    // 모든 브랜치의 커밋을 합치고 SHA 기준으로 중복 제거
    const allCommits = branchCommitsResults.flat();
    const uniqueCommitsMap = new Map<string, (typeof allCommits)[0]>();
    for (const commit of allCommits) {
      if (!uniqueCommitsMap.has(commit.sha)) {
        uniqueCommitsMap.set(commit.sha, commit);
      }
    }
    const uniqueCommits = Array.from(uniqueCommitsMap.values());

    // 병렬로 커밋 상세 정보 조회 (배치 처리)
    const commitDetails = await processBatch(uniqueCommits, async (commit) => {
      try {
        const detail = await getCommitDetail(repo, commit.sha);
        return {
          sha: commit.sha,
          repository: repo,
          message: commit.commit.message,
          author: commit.commit.author?.name || "Unknown",
          authorEmail: commit.commit.author?.email || null,
          authorAvatar: commit.author?.avatar_url || null,
          committedAt: new Date(commit.commit.author?.date || Date.now()),
          additions: detail.additions,
          deletions: detail.deletions,
          filesChanged: detail.filesChanged,
          url: commit.html_url,
          files: detail.files,
        };
      } catch (error) {
        console.error(`Error fetching commit detail for ${commit.sha}:`, error);
        return {
          sha: commit.sha,
          repository: repo,
          message: commit.commit.message,
          author: commit.commit.author?.name || "Unknown",
          authorEmail: commit.commit.author?.email || null,
          authorAvatar: commit.author?.avatar_url || null,
          committedAt: new Date(commit.commit.author?.date || Date.now()),
          additions: 0,
          deletions: 0,
          filesChanged: 0,
          url: commit.html_url,
          files: [],
        };
      }
    });

    return commitDetails;
  } catch (error) {
    console.error(`Error fetching commits for ${repo}:`, error);
    return [];
  }
}

async function getCommitDetail(
  repo: string,
  sha: string
): Promise<{ additions: number; deletions: number; filesChanged: number; files: CommitFileData[] }> {
  try {
    const { data } = await octokit.repos.getCommit({
      owner: ORG_NAME,
      repo,
      ref: sha,
    });

    const files: CommitFileData[] = (data.files || []).map((file) => ({
      filename: file.filename,
      status: file.status || "modified",
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
    }));

    return {
      additions: data.stats?.additions || 0,
      deletions: data.stats?.deletions || 0,
      filesChanged: data.files?.length || 0,
      files,
    };
  } catch (error) {
    console.error(`Error fetching commit detail:`, error);
    return { additions: 0, deletions: 0, filesChanged: 0, files: [] };
  }
}

export async function collectDailyCommits(targetDate: Date): Promise<CommitData[]> {
  // KST 기준 하루 범위
  const { start: startOfDay, end: endOfDay } = getKSTDayRange(targetDate);

  const repos = await getOrgRepos();

  // 리포지토리별로 병렬 처리 (배치 단위로)
  const repoCommits = await processBatch(
    repos,
    (repo) => getCommitsSince(repo, startOfDay, endOfDay),
    5 // 리포지토리 배치 크기
  );

  const allCommits = repoCommits.flat();

  // 커밋 시간순 정렬
  allCommits.sort(
    (a, b) => a.committedAt.getTime() - b.committedAt.getTime()
  );

  return allCommits;
}

/**
 * 특정 GitHub 사용자의 날짜별 커밋 조회 (진단용)
 */
export interface GitHubCommitSimple {
  sha: string;
  message: string;
  authorEmail: string | null;
  authorName: string | null;
  committedAt: string;
  repository: string;
  url: string;
}

export async function getCommitsByAuthor(
  githubName: string,
  targetDate: Date
): Promise<GitHubCommitSimple[]> {
  const { start: startOfDay, end: endOfDay } = getKSTDayRange(targetDate);
  const repos = await getOrgRepos();

  // 리포지토리별로 병렬 처리 (각 리포의 모든 브랜치 조회)
  const repoResults = await processBatch(
    repos,
    async (repo) => {
      try {
        // 해당 리포지토리의 모든 브랜치 조회
        const branches = await getRepoBranches(repo);

        if (branches.length === 0) {
          return [];
        }

        // 각 브랜치별로 커밋 조회
        const branchResults = await processBatch(
          branches,
          async (branch) => {
            try {
              return await octokit.paginate(octokit.repos.listCommits, {
                owner: ORG_NAME,
                repo,
                sha: branch, // 브랜치 지정
                author: githubName,
                since: startOfDay.toISOString(),
                until: endOfDay.toISOString(),
                per_page: 100,
              });
            } catch (error) {
              console.error(`Error fetching commits for ${repo}/${branch} by ${githubName}:`, error);
              return [];
            }
          },
          5
        );

        // 브랜치별 커밋을 합침
        const allBranchCommits = branchResults.flat();

        return allBranchCommits.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          authorEmail: c.commit.author?.email || null,
          authorName: c.commit.author?.name || null,
          committedAt: c.commit.author?.date || new Date().toISOString(),
          repository: repo,
          url: c.html_url,
        }));
      } catch (error) {
        console.error(`Error fetching commits for ${repo} by ${githubName}:`, error);
        return [];
      }
    },
    5
  );

  // 모든 리포지토리의 커밋을 합치고 SHA 기준으로 중복 제거
  const allCommits = repoResults.flat();
  const uniqueCommitsMap = new Map<string, GitHubCommitSimple>();
  for (const commit of allCommits) {
    if (!uniqueCommitsMap.has(commit.sha)) {
      uniqueCommitsMap.set(commit.sha, commit);
    }
  }
  const uniqueCommits = Array.from(uniqueCommitsMap.values());

  // 커밋 시간순 정렬
  uniqueCommits.sort(
    (a, b) => new Date(a.committedAt).getTime() - new Date(b.committedAt).getTime()
  );

  return uniqueCommits;
}

/**
 * 특정 GitHub 사용자의 날짜별 커밋 조회 (상세 정보 포함)
 * - additions, deletions, files 정보 포함
 * - DB 저장에 필요한 전체 정보 반환
 */
export async function getCommitsByAuthorWithDetails(
  githubName: string,
  targetDate: Date
): Promise<CommitData[]> {
  // 먼저 간단한 커밋 목록 조회
  const simpleCommits = await getCommitsByAuthor(githubName, targetDate);

  if (simpleCommits.length === 0) {
    return [];
  }

  // 각 커밋의 상세 정보 조회 (배치 처리)
  const detailedCommits = await processBatch(
    simpleCommits,
    async (commit) => {
      try {
        const detail = await getCommitDetail(commit.repository, commit.sha);
        return {
          sha: commit.sha,
          repository: commit.repository,
          message: commit.message,
          author: commit.authorName || "Unknown",
          authorEmail: commit.authorEmail,
          authorAvatar: null, // 상세 조회 시 avatar 정보는 별도 처리 필요
          committedAt: new Date(commit.committedAt),
          additions: detail.additions,
          deletions: detail.deletions,
          filesChanged: detail.filesChanged,
          url: commit.url,
          files: detail.files,
        };
      } catch (error) {
        console.error(`Error fetching commit detail for ${commit.sha}:`, error);
        return {
          sha: commit.sha,
          repository: commit.repository,
          message: commit.message,
          author: commit.authorName || "Unknown",
          authorEmail: commit.authorEmail,
          authorAvatar: null,
          committedAt: new Date(commit.committedAt),
          additions: 0,
          deletions: 0,
          filesChanged: 0,
          url: commit.url,
          files: [],
        };
      }
    },
    BATCH_SIZE
  );

  return detailedCommits;
}

/**
 * GitHub 검색 URL 생성
 */
export function buildGitHubSearchUrl(githubName: string, date: Date): string {
  const dateStr = date.toISOString().split("T")[0];
  return `https://github.com/search?q=org:${ORG_NAME}+author:${githubName}+committer-date:${dateStr}&type=commits`;
}

/**
 * GitHub noreply 이메일에서 사용자명 추출
 * 형식: {user_id}+{username}@users.noreply.github.com
 * 예: 101326118+sangheedev@users.noreply.github.com -> sangheedev
 */
export function extractUsernameFromNoreplyEmail(email: string | null): string | null {
  if (!email) return null;

  const noreplyMatch = email.match(/^\d+\+(.+)@users\.noreply\.github\.com$/);
  if (noreplyMatch) {
    return noreplyMatch[1];
  }

  // 구버전 noreply 형식: {username}@users.noreply.github.com
  const oldNoreplyMatch = email.match(/^(.+)@users\.noreply\.github\.com$/);
  if (oldNoreplyMatch) {
    return oldNoreplyMatch[1];
  }

  return null;
}

/**
 * 이메일이 GitHub noreply 형식인지 확인
 */
export function isGitHubNoreplyEmail(email: string | null): boolean {
  if (!email) return false;
  return email.endsWith("@users.noreply.github.com");
}

/**
 * 이메일을 표시용으로 정규화
 * - noreply 이메일: 사용자명만 표시 (예: sangheedev@github)
 * - 일반 이메일: 그대로 표시
 */
export function normalizeEmailForDisplay(email: string | null): string | null {
  if (!email) return null;

  const username = extractUsernameFromNoreplyEmail(email);
  if (username) {
    return `${username}@github`;
  }

  return email;
}

/**
 * 개발자 아이덴티티 정규화
 * author(GitHub 사용자명)를 기준으로 통합하고,
 * 이메일은 표시용으로 정규화
 */
export interface NormalizedDeveloperIdentity {
  /** GitHub 사용자명 (primary key) */
  username: string;
  /** 표시용 이메일 (noreply는 username@github 형식으로 변환) */
  displayEmail: string | null;
  /** 원본 이메일 */
  originalEmail: string | null;
  /** noreply 이메일 여부 */
  isNoreplyEmail: boolean;
}

export function normalizeDeveloperIdentity(
  author: string,
  email: string | null
): NormalizedDeveloperIdentity {
  return {
    username: author,
    displayEmail: normalizeEmailForDisplay(email),
    originalEmail: email,
    isNoreplyEmail: isGitHubNoreplyEmail(email),
  };
}

/**
 * GitHub 이슈 데이터 (DB 저장용)
 */
export interface IssueData {
  number: number;
  title: string;
  repository: string;
  state: "open" | "closed";
  url: string;
  assignees: string[];
  createdAt: Date;
}

/**
 * org의 모든 open 이슈 조회 (동기화용)
 * - 전체 리포지토리 조회 후 각 리포지토리의 open 이슈 수집
 */
export async function fetchOrgIssues(): Promise<IssueData[]> {
  try {
    const repos = await getOrgRepos();
    const allIssues: IssueData[] = [];

    // 리포지토리별로 병렬 처리
    const repoIssues = await processBatch(
      repos,
      async (repo) => {
        try {
          const issues = await octokit.paginate(octokit.issues.listForRepo, {
            owner: ORG_NAME,
            repo,
            state: "open",
            per_page: 100,
          });

          return issues
            .filter((issue) => !issue.pull_request) // PR 제외
            .map(
              (issue): IssueData => ({
                number: issue.number,
                title: issue.title,
                repository: repo,
                state: issue.state as "open" | "closed",
                url: issue.html_url,
                assignees: issue.assignees?.map((a) => a.login) || [],
                createdAt: new Date(issue.created_at),
              })
            );
        } catch (error) {
          console.error(`Error fetching issues for ${repo}:`, error);
          return [];
        }
      },
      5 // 배치 크기
    );

    allIssues.push(...repoIssues.flat());

    // 생성일 기준 내림차순 정렬 (최신순)
    allIssues.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return allIssues;
  } catch (error) {
    console.error("Error fetching org issues:", error);
    return [];
  }
}
