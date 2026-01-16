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
    const commits = await octokit.paginate(octokit.repos.listCommits, {
      owner: ORG_NAME,
      repo,
      since: since.toISOString(),
      until: until.toISOString(),
      per_page: 100,
    });

    // 병렬로 커밋 상세 정보 조회 (배치 처리)
    const commitDetails = await processBatch(commits, async (commit) => {
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

  const allCommits: GitHubCommitSimple[] = [];

  // 리포지토리별로 병렬 처리
  const repoResults = await processBatch(
    repos,
    async (repo) => {
      try {
        const commits = await octokit.paginate(octokit.repos.listCommits, {
          owner: ORG_NAME,
          repo,
          author: githubName,
          since: startOfDay.toISOString(),
          until: endOfDay.toISOString(),
          per_page: 100,
        });

        return commits.map((c) => ({
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

  for (const commits of repoResults) {
    allCommits.push(...commits);
  }

  // 커밋 시간순 정렬
  allCommits.sort(
    (a, b) => new Date(a.committedAt).getTime() - new Date(b.committedAt).getTime()
  );

  return allCommits;
}

/**
 * GitHub 검색 URL 생성
 */
export function buildGitHubSearchUrl(githubName: string, date: Date): string {
  const dateStr = date.toISOString().split("T")[0];
  return `https://github.com/search?q=org:${ORG_NAME}+author:${githubName}+committer-date:${dateStr}&type=commits`;
}
