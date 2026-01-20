/**
 * 과거 커밋 수집 - 2022년 이후 모든 커밋을 수집하기 위한 함수들
 * 월 단위로 분할 수집하여 GitHub API rate limit을 관리합니다.
 * 수집 로그를 통해 이미 수집된 기간은 건너뜁니다.
 */

import { Octokit } from "@octokit/rest";
import { CommitData, CommitFileData } from "./github";
import prisma from "@/lib/prisma";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = "studiobaton";

// 병렬 처리 배치 크기 (rate limit 고려해서 작게 설정)
const BATCH_SIZE = 5;
const COMMIT_DETAIL_BATCH_SIZE = 10;

export interface CollectionProgress {
  phase: "repos" | "commits" | "details" | "complete";
  currentRepo?: string;
  currentMonth?: string;
  processedRepos: number;
  totalRepos: number;
  processedCommits: number;
  totalCommits: number;
  message: string;
}

export interface CollectionResult {
  commits: CommitData[];
  totalProcessed: number;
  errors: string[];
}

/**
 * 월 단위 날짜 범위 생성
 */
export function generateMonthRanges(
  startDate: Date,
  endDate: Date
): Array<{ start: Date; end: Date; label: string }> {
  const ranges: Array<{ start: Date; end: Date; label: string }> = [];
  const current = new Date(startDate);
  current.setDate(1); // 월 시작일로 설정

  while (current <= endDate) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

    // 종료일이 endDate를 넘지 않도록
    const effectiveEnd = monthEnd > endDate ? endDate : monthEnd;

    ranges.push({
      start: monthStart,
      end: effectiveEnd,
      label: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
    });

    // 다음 달로 이동
    current.setMonth(current.getMonth() + 1);
  }

  return ranges;
}

interface RepoInfo {
  name: string;
  createdAt: Date;
}

/**
 * 레포지토리 목록 조회 (생성일 포함)
 */
async function getOrgRepos(): Promise<RepoInfo[]> {
  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: ORG_NAME,
      type: "all",
      per_page: 100,
    });
    return repos.map((repo) => ({
      name: repo.name,
      createdAt: new Date(repo.created_at || "2020-01-01"),
    }));
  } catch (error) {
    console.error("Error fetching org repos:", error);
    return [];
  }
}

/**
 * 레포지토리의 모든 브랜치 목록 조회
 */
async function getRepoBranches(repo: string): Promise<string[]> {
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

/**
 * 배치 처리 헬퍼
 */
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

/**
 * 커밋 상세 정보 조회
 */
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
    console.error(`Error fetching commit detail for ${sha}:`, error);
    return { additions: 0, deletions: 0, filesChanged: 0, files: [] };
  }
}

/**
 * 특정 기간의 레포지토리 커밋 조회 (모든 브랜치)
 */
async function getRepoCommitsForPeriod(
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
            sha: branch,
            since: since.toISOString(),
            until: until.toISOString(),
            per_page: 100,
          });
        } catch (error) {
          // 404나 빈 저장소 에러는 무시
          const errMsg = error instanceof Error ? error.message : String(error);
          if (!errMsg.includes("Git Repository is empty") && !errMsg.includes("404")) {
            console.error(`Error fetching commits for ${repo}/${branch}:`, error);
          }
          return [];
        }
      },
      3 // 브랜치 배치 크기는 작게
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

    // 커밋 상세 정보 없이 기본 정보만 반환 (상세는 나중에 배치로 처리)
    return uniqueCommits.map((commit) => ({
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
    }));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (!errMsg.includes("Git Repository is empty") && !errMsg.includes("404")) {
      console.error(`Error fetching commits for ${repo}:`, error);
    }
    return [];
  }
}

/**
 * 과거 커밋 전체 수집 (2022년 이후)
 * 월 단위로 분할하여 수집하며, 진행 상황을 콜백으로 전달합니다.
 */
export async function collectHistoricalCommits(
  startDate: Date,
  endDate: Date,
  onProgress?: (progress: CollectionProgress) => void,
  options?: {
    includeDetails?: boolean; // 커밋 상세 정보 포함 여부 (기본: false, 느림)
    existingShas?: Set<string>; // 이미 수집된 SHA 목록 (중복 방지)
  }
): Promise<CollectionResult> {
  const errors: string[] = [];
  const allCommits: CommitData[] = [];
  const existingShas = options?.existingShas || new Set<string>();
  const includeDetails = options?.includeDetails ?? false;

  // 1. 레포지토리 목록 조회
  onProgress?.({
    phase: "repos",
    processedRepos: 0,
    totalRepos: 0,
    processedCommits: 0,
    totalCommits: 0,
    message: "레포지토리 목록을 조회하고 있습니다...",
  });

  const repos = await getOrgRepos();
  if (repos.length === 0) {
    errors.push("레포지토리 목록을 조회할 수 없습니다.");
    return { commits: [], totalProcessed: 0, errors };
  }

  onProgress?.({
    phase: "commits",
    processedRepos: 0,
    totalRepos: repos.length,
    processedCommits: 0,
    totalCommits: 0,
    message: `${repos.length}개 레포지토리를 수집합니다. (레포별 생성일 기준)`,
  });

  // 2. 각 레포지토리별로 월 단위 수집 (레포 생성일부터)
  for (let repoIdx = 0; repoIdx < repos.length; repoIdx++) {
    const repo = repos[repoIdx];

    // 레포 생성일과 요청 시작일 중 더 늦은 날짜부터 수집
    const effectiveStartDate = repo.createdAt > startDate ? repo.createdAt : startDate;

    // 레포 생성일이 종료일 이후면 스킵
    if (effectiveStartDate > endDate) {
      onProgress?.({
        phase: "commits",
        currentRepo: repo.name,
        processedRepos: repoIdx + 1,
        totalRepos: repos.length,
        processedCommits: allCommits.length,
        totalCommits: allCommits.length,
        message: `${repo.name} 스킵 (생성일: ${repo.createdAt.toISOString().slice(0, 10)})`,
      });
      continue;
    }

    // 해당 레포에 대한 월 범위 생성
    const monthRanges = generateMonthRanges(effectiveStartDate, endDate);

    for (const range of monthRanges) {
      // 이미 수집된 기간인지 확인
      const alreadyCollected = await isMonthCollected(repo.name, range.label);
      if (alreadyCollected) {
        onProgress?.({
          phase: "commits",
          currentRepo: repo.name,
          currentMonth: range.label,
          processedRepos: repoIdx,
          totalRepos: repos.length,
          processedCommits: allCommits.length,
          totalCommits: allCommits.length,
          message: `${repo.name} (${range.label}) 이미 수집됨 - 건너뜀`,
        });
        continue;
      }

      onProgress?.({
        phase: "commits",
        currentRepo: repo.name,
        currentMonth: range.label,
        processedRepos: repoIdx,
        totalRepos: repos.length,
        processedCommits: allCommits.length,
        totalCommits: allCommits.length,
        message: `${repo.name} (${range.label}) 커밋 수집 중... (생성일: ${repo.createdAt.toISOString().slice(0, 10)})`,
      });

      try {
        const commits = await getRepoCommitsForPeriod(repo.name, range.start, range.end);

        // 중복 제거 (이미 수집된 SHA 제외)
        const newCommits = commits.filter((c) => !existingShas.has(c.sha));

        // SHA 기록
        newCommits.forEach((c) => existingShas.add(c.sha));

        allCommits.push(...newCommits);

        // 수집 성공 기록
        await recordCollectionResult(repo.name, range.label, "completed", newCommits.length);
      } catch (error) {
        const errMsg = `${repo.name}/${range.label}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errMsg);

        // 수집 실패 기록
        await recordCollectionResult(repo.name, range.label, "error", 0, errMsg);
      }

      // rate limit 방지를 위한 짧은 대기
      await sleep(100);
    }
  }

  // 4. 커밋 상세 정보 조회 (선택적)
  if (includeDetails && allCommits.length > 0) {
    onProgress?.({
      phase: "details",
      processedRepos: repos.length,
      totalRepos: repos.length,
      processedCommits: 0,
      totalCommits: allCommits.length,
      message: `${allCommits.length}개 커밋의 상세 정보를 조회합니다...`,
    });

    for (let i = 0; i < allCommits.length; i += COMMIT_DETAIL_BATCH_SIZE) {
      const batch = allCommits.slice(i, i + COMMIT_DETAIL_BATCH_SIZE);

      await Promise.all(
        batch.map(async (commit) => {
          try {
            const detail = await getCommitDetail(commit.repository, commit.sha);
            commit.additions = detail.additions;
            commit.deletions = detail.deletions;
            commit.filesChanged = detail.filesChanged;
            commit.files = detail.files;
          } catch (error) {
            // 상세 조회 실패는 무시 (기본값 0 유지)
          }
        })
      );

      onProgress?.({
        phase: "details",
        processedRepos: repos.length,
        totalRepos: repos.length,
        processedCommits: Math.min(i + COMMIT_DETAIL_BATCH_SIZE, allCommits.length),
        totalCommits: allCommits.length,
        message: `상세 정보 조회 중... (${Math.min(i + COMMIT_DETAIL_BATCH_SIZE, allCommits.length)}/${allCommits.length})`,
      });

      // rate limit 방지
      await sleep(200);
    }
  }

  // 5. 완료
  onProgress?.({
    phase: "complete",
    processedRepos: repos.length,
    totalRepos: repos.length,
    processedCommits: allCommits.length,
    totalCommits: allCommits.length,
    message: `수집 완료: ${allCommits.length}개 커밋`,
  });

  // 시간순 정렬
  allCommits.sort((a, b) => a.committedAt.getTime() - b.committedAt.getTime());

  return {
    commits: allCommits,
    totalProcessed: allCommits.length,
    errors,
  };
}

/**
 * 특정 날짜의 신규 커밋만 수집 (증분 수집용)
 * 기존 CommitLog에 없는 커밋만 수집합니다.
 */
export async function collectIncrementalCommits(
  targetDate: Date,
  existingShas: Set<string>,
  onProgress?: (progress: CollectionProgress) => void
): Promise<CollectionResult> {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return collectHistoricalCommits(startOfDay, endOfDay, onProgress, {
    includeDetails: true,
    existingShas,
  });
}

/**
 * GitHub API rate limit 상태 조회
 */
export async function getRateLimitStatus(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}> {
  try {
    const { data } = await octokit.rateLimit.get();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
      used: data.rate.used,
    };
  } catch (error) {
    console.error("Error fetching rate limit:", error);
    return {
      limit: 5000,
      remaining: 0,
      reset: new Date(),
      used: 5000,
    };
  }
}

/**
 * 예상 수집 시간 계산 (대략적)
 */
export function estimateCollectionTime(
  repoCount: number,
  monthCount: number
): { minutes: number; description: string } {
  // 각 레포지토리당 월당 약 2초 (브랜치 조회 + 커밋 목록)
  // + 커밋당 상세 조회 시간 (상세 포함시)
  const baseMinutes = Math.ceil((repoCount * monthCount * 2) / 60);

  return {
    minutes: baseMinutes,
    description: `약 ${baseMinutes}분 ~ ${baseMinutes * 2}분 소요 예상 (rate limit 상황에 따라 변동)`,
  };
}

/**
 * 특정 레포+월이 이미 수집되었는지 확인
 */
async function isMonthCollected(repository: string, monthKey: string): Promise<boolean> {
  try {
    const log = await prisma.commitCollectionLog.findUnique({
      where: {
        repository_monthKey: { repository, monthKey },
      },
    });
    return log?.status === "completed";
  } catch (error) {
    console.error(`Error checking collection log for ${repository}/${monthKey}:`, error);
    return false;
  }
}

/**
 * 수집 결과 기록
 */
async function recordCollectionResult(
  repository: string,
  monthKey: string,
  status: "completed" | "partial" | "error",
  commitCount: number,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.commitCollectionLog.upsert({
      where: {
        repository_monthKey: { repository, monthKey },
      },
      update: {
        status,
        commitCount,
        errorMessage,
        collectedAt: new Date(),
      },
      create: {
        repository,
        monthKey,
        status,
        commitCount,
        errorMessage,
      },
    });
  } catch (error) {
    console.error(`Error recording collection log for ${repository}/${monthKey}:`, error);
  }
}

/**
 * 특정 레포의 수집 로그 조회
 */
export async function getCollectionLogs(repository?: string): Promise<{
  repository: string;
  monthKey: string;
  status: string;
  commitCount: number;
  collectedAt: Date;
}[]> {
  try {
    const logs = await prisma.commitCollectionLog.findMany({
      where: repository ? { repository } : undefined,
      orderBy: [{ repository: "asc" }, { monthKey: "asc" }],
    });
    return logs.map((log) => ({
      repository: log.repository,
      monthKey: log.monthKey,
      status: log.status,
      commitCount: log.commitCount,
      collectedAt: log.collectedAt,
    }));
  } catch (error) {
    console.error("Error fetching collection logs:", error);
    return [];
  }
}

/**
 * 수집 로그 초기화 (재수집 필요시)
 */
export async function clearCollectionLogs(repository?: string): Promise<number> {
  try {
    const result = await prisma.commitCollectionLog.deleteMany({
      where: repository ? { repository } : undefined,
    });
    return result.count;
  } catch (error) {
    console.error("Error clearing collection logs:", error);
    return 0;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
