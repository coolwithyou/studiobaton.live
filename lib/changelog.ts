import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// 블로그 레포지토리 정보
const BLOG_OWNER = "coolwithyou";
const BLOG_REPO = "studiobaton.live";

export type CommitType =
  | "feat"
  | "fix"
  | "style"
  | "docs"
  | "refactor"
  | "chore"
  | "other";

export interface ChangelogCommit {
  sha: string;
  message: string;
  type: CommitType;
  title: string; // 타입 제거한 첫 줄
  date: Date;
  author: string;
  authorAvatar: string | null;
  url: string;
}

/**
 * 커밋 메시지에서 타입 파싱
 * 예: "feat: 새 기능 추가" -> { type: "feat", title: "새 기능 추가" }
 */
function parseCommitMessage(message: string): {
  type: CommitType;
  title: string;
} {
  const firstLine = message.split("\n")[0].trim();

  // Conventional Commits 패턴: type(scope): description 또는 type: description
  const conventionalMatch = firstLine.match(
    /^(feat|fix|style|docs|refactor|chore)(?:\([^)]+\))?:\s*(.+)$/i
  );

  if (conventionalMatch) {
    const type = conventionalMatch[1].toLowerCase() as CommitType;
    const title = conventionalMatch[2].trim();
    return { type, title };
  }

  // 타입이 없는 경우
  return { type: "other", title: firstLine };
}

/**
 * 블로그 레포지토리의 최근 커밋 조회
 */
export async function fetchBlogCommits(
  count: number = 100
): Promise<ChangelogCommit[]> {
  try {
    const { data: commits } = await octokit.repos.listCommits({
      owner: BLOG_OWNER,
      repo: BLOG_REPO,
      per_page: count,
    });

    return commits.map((commit) => {
      const { type, title } = parseCommitMessage(commit.commit.message);

      return {
        sha: commit.sha,
        message: commit.commit.message,
        type,
        title,
        date: new Date(commit.commit.author?.date || Date.now()),
        author: commit.commit.author?.name || "Unknown",
        authorAvatar: commit.author?.avatar_url || null,
        url: commit.html_url,
      };
    });
  } catch (error) {
    console.error("Error fetching blog commits:", error);
    return [];
  }
}

/**
 * 커밋 타입별 아이콘 반환
 */
export function getCommitTypeIcon(type: CommitType): string {
  const icons: Record<CommitType, string> = {
    feat: "✨",
    fix: "🐛",
    style: "🎨",
    docs: "📝",
    refactor: "♻️",
    chore: "🔧",
    other: "📌",
  };
  return icons[type];
}

/**
 * 커밋 타입별 레이블 반환
 */
export function getCommitTypeLabel(type: CommitType): string {
  const labels: Record<CommitType, string> = {
    feat: "새 기능",
    fix: "버그 수정",
    style: "스타일",
    docs: "문서",
    refactor: "리팩토링",
    chore: "기타 작업",
    other: "기타",
  };
  return labels[type];
}

/**
 * 커밋을 날짜별로 그룹핑
 */
export function groupCommitsByDate(
  commits: ChangelogCommit[]
): Map<string, ChangelogCommit[]> {
  const groups = new Map<string, ChangelogCommit[]>();

  for (const commit of commits) {
    // KST 기준 날짜 키 생성
    const kstDate = new Date(commit.date.getTime() + 9 * 60 * 60 * 1000);
    const dateKey = kstDate.toISOString().split("T")[0];

    const existing = groups.get(dateKey) || [];
    existing.push(commit);
    groups.set(dateKey, existing);
  }

  return groups;
}

/**
 * 날짜 문자열을 한글 형식으로 변환
 * 예: "2025-01-26" -> "2025년 1월 26일 (일)"
 */
export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00+09:00"); // KST 기준
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = dayNames[date.getDay()];

  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}
