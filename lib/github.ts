import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const ORG_NAME = "studiobaton";

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

    const commitDetails: CommitData[] = [];

    for (const commit of commits) {
      try {
        const detail = await getCommitDetail(repo, commit.sha);
        commitDetails.push({
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
        });
      } catch (error) {
        console.error(`Error fetching commit detail for ${commit.sha}:`, error);
      }
    }

    return commitDetails;
  } catch (error) {
    console.error(`Error fetching commits for ${repo}:`, error);
    return [];
  }
}

async function getCommitDetail(
  repo: string,
  sha: string
): Promise<{ additions: number; deletions: number; filesChanged: number }> {
  try {
    const { data } = await octokit.repos.getCommit({
      owner: ORG_NAME,
      repo,
      ref: sha,
    });
    return {
      additions: data.stats?.additions || 0,
      deletions: data.stats?.deletions || 0,
      filesChanged: data.files?.length || 0,
    };
  } catch (error) {
    console.error(`Error fetching commit detail:`, error);
    return { additions: 0, deletions: 0, filesChanged: 0 };
  }
}

export async function collectDailyCommits(targetDate: Date): Promise<CommitData[]> {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const repos = await getOrgRepos();
  const allCommits: CommitData[] = [];

  for (const repo of repos) {
    const commits = await getCommitsSince(repo, startOfDay, endOfDay);
    allCommits.push(...commits);
  }

  // 커밋 시간순 정렬
  allCommits.sort(
    (a, b) => a.committedAt.getTime() - b.committedAt.getTime()
  );

  return allCommits;
}
