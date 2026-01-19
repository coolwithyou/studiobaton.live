import prisma from "@/lib/prisma";

/**
 * Member 테이블 기반 저자 정규화
 *
 * 문제: Git 커밋의 author 필드가 일관되지 않음
 * - GitHub username: "sangheedev", "coolwithyou"
 * - Git config name: "Lee Sanghee", "Cool with you"
 *
 * 해결: Member 테이블을 활용하여 동일인을 하나의 ID로 통합
 */

export interface AuthorMapping {
  /** 정규화된 ID (githubName 우선 사용) */
  normalizedId: string;
  /** 표시용 이름 */
  displayName: string;
  /** 아바타 URL */
  avatarUrl: string | null;
  /** 원본 author 값들 (매칭된 모든 값) */
  originalAuthors: Set<string>;
}

interface MemberData {
  name: string;
  githubName: string;
  email: string;
  avatarUrl: string | null;
}

// 캐시 (서버 재시작 전까지 유지)
let memberCache: MemberData[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

/**
 * Member 데이터 조회 (캐싱 적용)
 */
async function getMembers(): Promise<MemberData[]> {
  const now = Date.now();

  if (memberCache && now - cacheTimestamp < CACHE_TTL) {
    return memberCache;
  }

  memberCache = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      name: true,
      githubName: true,
      email: true,
      avatarUrl: true,
    },
  });
  cacheTimestamp = now;

  return memberCache;
}

/**
 * 캐시 무효화 (Member 데이터 변경 시 호출)
 */
export function invalidateMemberCache(): void {
  memberCache = null;
  cacheTimestamp = 0;
}

/**
 * 단일 author를 정규화된 ID로 변환
 *
 * 매칭 우선순위:
 * 1. author === Member.githubName (대소문자 무시)
 * 2. author === Member.name (대소문자 무시)
 *
 * @param author - Git 커밋의 author 필드
 * @param authorEmail - Git 커밋의 authorEmail 필드 (선택적 추가 매칭)
 * @param members - Member 데이터 배열 (미리 조회된 경우)
 * @returns 정규화된 author 정보
 */
export async function normalizeAuthor(
  author: string,
  authorEmail?: string | null,
  members?: MemberData[]
): Promise<{ normalizedId: string; displayName: string; avatarUrl: string | null }> {
  const memberList = members ?? (await getMembers());
  const authorLower = author.toLowerCase();
  const emailLower = authorEmail?.toLowerCase();

  // 1. githubName 매칭 (가장 정확)
  let match = memberList.find(
    (m) => m.githubName.toLowerCase() === authorLower
  );

  // 2. name 매칭
  if (!match) {
    match = memberList.find((m) => m.name.toLowerCase() === authorLower);
  }

  // 3. email 매칭 (noreply 이메일 포함)
  if (!match && emailLower) {
    match = memberList.find((m) => {
      if (m.email.toLowerCase() === emailLower) return true;

      // noreply 이메일에서 username 추출 후 비교
      const noreplyMatch = emailLower.match(
        /^(\d+\+)?(.+)@users\.noreply\.github\.com$/
      );
      if (noreplyMatch) {
        const username = noreplyMatch[2];
        return m.githubName.toLowerCase() === username;
      }

      return false;
    });
  }

  if (match) {
    return {
      normalizedId: match.githubName,
      displayName: match.githubName,
      avatarUrl: match.avatarUrl,
    };
  }

  // 매칭되지 않으면 원본 그대로
  return {
    normalizedId: author,
    displayName: author,
    avatarUrl: null,
  };
}

/**
 * 커밋 배열에서 고유한 저자 목록 추출 (정규화 적용)
 *
 * @param commits - 커밋 배열
 * @returns 정규화된 고유 저자 목록
 */
export async function getUniqueAuthors(
  commits: Array<{
    author: string;
    authorEmail?: string | null;
    authorAvatar?: string | null;
  }>
): Promise<
  Array<{
    name: string;
    avatar: string | null;
    originalAuthors: string[];
  }>
> {
  const members = await getMembers();
  const authorMap = new Map<
    string,
    {
      name: string;
      avatar: string | null;
      originalAuthors: Set<string>;
    }
  >();

  for (const commit of commits) {
    const normalized = await normalizeAuthor(
      commit.author,
      commit.authorEmail,
      members
    );

    const existing = authorMap.get(normalized.normalizedId);
    if (existing) {
      existing.originalAuthors.add(commit.author);
      // 아바타가 없으면 커밋의 아바타 사용
      if (!existing.avatar && commit.authorAvatar) {
        existing.avatar = commit.authorAvatar;
      }
    } else {
      authorMap.set(normalized.normalizedId, {
        name: normalized.displayName,
        avatar: normalized.avatarUrl || commit.authorAvatar || null,
        originalAuthors: new Set([commit.author]),
      });
    }
  }

  return Array.from(authorMap.values()).map((author) => ({
    name: author.name,
    avatar: author.avatar,
    originalAuthors: Array.from(author.originalAuthors),
  }));
}

/**
 * 커밋에 정규화된 저자 정보 추가
 * (원본 author는 보존, normalizedAuthor 필드 추가)
 */
export async function enrichCommitsWithNormalizedAuthor<
  T extends { author: string; authorEmail?: string | null }
>(commits: T[]): Promise<(T & { normalizedAuthor: string })[]> {
  const members = await getMembers();

  return Promise.all(
    commits.map(async (commit) => {
      const normalized = await normalizeAuthor(
        commit.author,
        commit.authorEmail,
        members
      );
      return {
        ...commit,
        normalizedAuthor: normalized.normalizedId,
      };
    })
  );
}
