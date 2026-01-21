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

/**
 * Member 전체 정보 (PostAuthorSection용)
 */
export interface FullMemberData {
  id: string;
  name: string;
  githubName: string;
  email: string;
  avatarUrl: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  title: string | null;
  role: string | null;
}

/**
 * 작성자 전체 정보 (포스트 하단 표시용)
 */
export interface FullAuthorInfo {
  /** Member ID */
  id: string;
  /** 이름 */
  name: string;
  /** GitHub username */
  githubName: string;
  /** 1:1 아바타 URL */
  avatarUrl: string | null;
  /** 3:4 프로필 이미지 URL */
  profileImageUrl: string | null;
  /** 자기소개 */
  bio: string | null;
  /** 직함 */
  title: string | null;
  /** 역할 */
  role: string | null;
  /** 원본 author 값들 */
  originalAuthors: string[];
  /** Member 테이블에서 매칭되었는지 여부 */
  isMemberMatched: boolean;
}

/**
 * 커밋 참여자 정보 (통계 포함)
 */
export interface ContributorWithStats {
  /** ID (githubName 또는 원본 author) */
  id: string;
  /** 표시 이름 */
  name: string;
  /** GitHub username */
  githubName: string;
  /** 아바타 URL */
  avatarUrl: string | null;
  /** 역할 */
  role: string | null;
  /** Member 테이블에서 매칭되었는지 여부 */
  isMemberMatched: boolean;
  /** 커밋 수 */
  commits: number;
  /** 추가된 라인 수 */
  additions: number;
  /** 삭제된 라인 수 */
  deletions: number;
}

// 캐시 (서버 재시작 전까지 유지)
let memberCache: MemberData[] | null = null;
let fullMemberCache: FullMemberData[] | null = null;
let cacheTimestamp = 0;
let fullCacheTimestamp = 0;
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
  fullMemberCache = null;
  cacheTimestamp = 0;
  fullCacheTimestamp = 0;
}

/**
 * Member 전체 데이터 조회 (캐싱 적용)
 */
async function getFullMembers(): Promise<FullMemberData[]> {
  const now = Date.now();

  if (fullMemberCache && now - fullCacheTimestamp < CACHE_TTL) {
    return fullMemberCache;
  }

  fullMemberCache = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      githubName: true,
      email: true,
      avatarUrl: true,
      profileImageUrl: true,
      bio: true,
      title: true,
      role: true,
    },
  });
  fullCacheTimestamp = now;

  return fullMemberCache;
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
): Promise<{
  normalizedId: string;
  displayName: string;
  githubName: string | null;
  avatarUrl: string | null;
}> {
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
      displayName: match.name,
      githubName: match.githubName,
      avatarUrl: match.avatarUrl,
    };
  }

  // 매칭되지 않으면 원본 그대로
  return {
    normalizedId: author,
    displayName: author,
    githubName: null,
    avatarUrl: null,
  };
}

/**
 * 커밋 배열에서 고유한 저자 목록 추출 (정규화 적용)
 * 변경한 코드양(additions + deletions) 기준 내림차순 정렬
 *
 * @param commits - 커밋 배열
 * @returns 정규화된 고유 저자 목록 (변경량 순)
 */
export async function getUniqueAuthors(
  commits: Array<{
    author: string;
    authorEmail?: string | null;
    authorAvatar?: string | null;
    additions?: number;
    deletions?: number;
  }>
): Promise<
  Array<{
    name: string;
    githubName: string | null;
    avatar: string | null;
    originalAuthors: string[];
  }>
> {
  const members = await getMembers();
  const authorMap = new Map<
    string,
    {
      name: string;
      githubName: string | null;
      avatar: string | null;
      originalAuthors: Set<string>;
      totalChanges: number;
    }
  >();

  for (const commit of commits) {
    const normalized = await normalizeAuthor(
      commit.author,
      commit.authorEmail,
      members
    );

    const changes = (commit.additions || 0) + (commit.deletions || 0);
    const existing = authorMap.get(normalized.normalizedId);
    if (existing) {
      existing.originalAuthors.add(commit.author);
      existing.totalChanges += changes;
      // 아바타가 없으면 커밋의 아바타 사용
      if (!existing.avatar && commit.authorAvatar) {
        existing.avatar = commit.authorAvatar;
      }
    } else {
      authorMap.set(normalized.normalizedId, {
        name: normalized.displayName,
        githubName: normalized.githubName,
        avatar: normalized.avatarUrl || commit.authorAvatar || null,
        originalAuthors: new Set([commit.author]),
        totalChanges: changes,
      });
    }
  }

  // 변경량(additions + deletions) 기준 내림차순 정렬
  return Array.from(authorMap.values())
    .sort((a, b) => b.totalChanges - a.totalChanges)
    .map((author) => ({
      name: author.name,
      githubName: author.githubName,
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

/**
 * 커밋 배열에서 고유한 저자 목록 추출 (Member 전체 정보 포함)
 * PostAuthorSection 컴포넌트에서 사용
 *
 * @param commits - 커밋 배열
 * @returns Member 전체 정보가 포함된 저자 목록
 */
export async function getFullAuthorInfo(
  commits: Array<{
    author: string;
    authorEmail?: string | null;
    authorAvatar?: string | null;
  }>
): Promise<FullAuthorInfo[]> {
  const members = await getFullMembers();
  const authorMap = new Map<string, FullAuthorInfo>();

  for (const commit of commits) {
    const authorLower = commit.author.toLowerCase();
    const emailLower = commit.authorEmail?.toLowerCase();

    // Member 매칭 로직 (normalizeAuthor와 동일)
    let match: FullMemberData | undefined;

    // 1. githubName 매칭
    match = members.find((m) => m.githubName.toLowerCase() === authorLower);

    // 2. name 매칭
    if (!match) {
      match = members.find((m) => m.name.toLowerCase() === authorLower);
    }

    // 3. email 매칭 (noreply 이메일 포함)
    if (!match && emailLower) {
      match = members.find((m) => {
        if (m.email.toLowerCase() === emailLower) return true;

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
      const existing = authorMap.get(match.githubName);
      if (existing) {
        existing.originalAuthors.push(commit.author);
      } else {
        authorMap.set(match.githubName, {
          id: match.id,
          name: match.name,
          githubName: match.githubName,
          avatarUrl: match.avatarUrl,
          profileImageUrl: match.profileImageUrl,
          bio: match.bio,
          title: match.title,
          role: match.role,
          originalAuthors: [commit.author],
          isMemberMatched: true,
        });
      }
    } else {
      // 매칭되지 않은 경우 기본 정보만
      const normalizedId = commit.author;
      const existing = authorMap.get(normalizedId);
      if (!existing) {
        authorMap.set(normalizedId, {
          id: normalizedId,
          name: commit.author,
          githubName: commit.author,
          avatarUrl: commit.authorAvatar || null,
          profileImageUrl: null,
          bio: null,
          title: null,
          role: null,
          originalAuthors: [commit.author],
          isMemberMatched: false,
        });
      }
    }
  }

  return Array.from(authorMap.values());
}

/**
 * 커밋 배열에서 참여자별 통계 집계
 * 커밋 참여자 미니카드 표시용
 *
 * @param commits - 커밋 배열 (additions, deletions 포함)
 * @returns 참여자별 통계가 포함된 목록
 */
export async function getContributorsWithStats(
  commits: Array<{
    author: string;
    authorEmail?: string | null;
    authorAvatar?: string | null;
    additions: number;
    deletions: number;
  }>
): Promise<ContributorWithStats[]> {
  const members = await getFullMembers();
  const contributorMap = new Map<string, ContributorWithStats>();

  for (const commit of commits) {
    const authorLower = commit.author.toLowerCase();
    const emailLower = commit.authorEmail?.toLowerCase();

    // Member 매칭 로직 (normalizeAuthor와 동일)
    let match: FullMemberData | undefined;

    // 1. githubName 매칭
    match = members.find((m) => m.githubName.toLowerCase() === authorLower);

    // 2. name 매칭
    if (!match) {
      match = members.find((m) => m.name.toLowerCase() === authorLower);
    }

    // 3. email 매칭 (noreply 이메일 포함)
    if (!match && emailLower) {
      match = members.find((m) => {
        if (m.email.toLowerCase() === emailLower) return true;

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

    const key = match ? match.githubName : commit.author;
    const existing = contributorMap.get(key);

    if (existing) {
      existing.commits++;
      existing.additions += commit.additions;
      existing.deletions += commit.deletions;
    } else {
      contributorMap.set(key, {
        id: match?.id || commit.author,
        name: match?.name || commit.author,
        githubName: match?.githubName || commit.author,
        avatarUrl: match?.avatarUrl || commit.authorAvatar || null,
        role: match?.role || null,
        isMemberMatched: !!match,
        commits: 1,
        additions: commit.additions,
        deletions: commit.deletions,
      });
    }
  }

  // 변경량(additions + deletions) 기준 내림차순 정렬
  return Array.from(contributorMap.values()).sort(
    (a, b) => b.additions + b.deletions - (a.additions + a.deletions)
  );
}
