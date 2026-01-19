import prisma from "@/lib/prisma";

// 프로젝트 매핑 타입
export interface ProjectMaskingInfo {
  displayName: string;
  maskName: string | null;
  isRegistered: boolean; // ProjectMapping이 등록되어 있는지 여부
}

export type ProjectMappingsMap = Map<string, ProjectMaskingInfo>;

// 전체 리포지토리 목록 (마스킹 인덱스 부여용)
export type AllRepositoriesMap = Map<string, number>; // repositoryName -> 고정 인덱스

// 캐시 (5분 TTL)
let projectMappingsCache: ProjectMappingsMap | null = null;
let allRepositoriesCache: AllRepositoriesMap | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

// Repository 테이블 + ProjectMapping 조인하여 전체 데이터 조회 (캐싱)
export async function getProjectMappings(): Promise<ProjectMappingsMap> {
  const now = Date.now();
  if (projectMappingsCache && now - cacheTimestamp < CACHE_TTL) {
    return projectMappingsCache;
  }

  // Repository와 ProjectMapping 모두 조회
  const [repositories, mappings] = await Promise.all([
    prisma.repository.findMany({
      where: { isDeleted: false },
      select: { name: true },
      orderBy: { name: "asc" }, // 이름순 정렬로 일관된 인덱스 부여
    }),
    prisma.projectMapping.findMany({
      select: {
        repositoryName: true,
        displayName: true,
        maskName: true,
      },
    }),
  ]);

  // ProjectMapping을 Map으로 변환
  const mappingsByRepo = new Map(
    mappings.map((m) => [m.repositoryName, m])
  );

  // 모든 리포지토리에 대해 마스킹 정보 생성
  // Repository 테이블에 있는 리포지토리들에게 일관된 인덱스 부여
  projectMappingsCache = new Map();
  allRepositoriesCache = new Map();

  repositories.forEach((repo, index) => {
    const mapping = mappingsByRepo.get(repo.name);
    allRepositoriesCache!.set(repo.name, index);

    if (mapping) {
      // ProjectMapping이 있는 경우
      projectMappingsCache!.set(repo.name, {
        displayName: mapping.displayName,
        maskName: mapping.maskName,
        isRegistered: true,
      });
    } else {
      // ProjectMapping이 없는 경우 - Repository 테이블 기반 자동 마스킹
      projectMappingsCache!.set(repo.name, {
        displayName: repo.name, // 로그인 사용자에게는 원본 이름
        maskName: null, // 비로그인 사용자에게는 "Repository A, B, C" 형식
        isRegistered: false,
      });
    }
  });

  cacheTimestamp = now;
  return projectMappingsCache;
}

// 전체 리포지토리 인덱스 맵 조회 (캐싱된 값 반환)
export async function getAllRepositoriesIndexMap(): Promise<AllRepositoriesMap> {
  // getProjectMappings 호출하여 캐시 갱신
  await getProjectMappings();
  return allRepositoriesCache || new Map();
}

// 캐시 무효화 (관리자가 매핑을 수정할 때 호출)
export function invalidateProjectMappingsCache(): void {
  projectMappingsCache = null;
  allRepositoriesCache = null;
  cacheTimestamp = 0;
}

// 인덱스를 Excel 스타일 알파벳으로 변환 (A, B, ... Z, AA, AB, ... AZ, BA, ...)
export function indexToAlpha(index: number): string {
  let result = "";
  let n = index;

  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return result;
}

// 리포지토리 인덱스 맵 생성 (Repository A, B, C... 형식용)
export function createRepositoryIndexMap(
  repositories: string[]
): Map<string, number> {
  const uniqueRepos = [...new Set(repositories)];
  return new Map(uniqueRepos.map((repo, index) => [repo, index]));
}

// 프로젝트명 마스킹
export function maskProjectName(
  repositoryName: string,
  mappings: ProjectMappingsMap,
  isAuthenticated: boolean,
  repoIndexMap?: Map<string, number>
): string {
  const mapping = mappings.get(repositoryName);

  if (isAuthenticated) {
    return mapping ? mapping.displayName : repositoryName;
  }

  // 비로그인: maskName이 있으면 사용, 없으면 "Repository A, B, C" 형식
  if (mapping?.maskName) {
    return mapping.maskName;
  }

  // Repository A, B, C... 형식으로 표시
  const index = repoIndexMap?.get(repositoryName) ?? 0;
  return `Repository ${indexToAlpha(index)}`;
}

// 커밋 메시지 마스킹 (비로그인 시 카테고리로 표시)
export function maskCommitMessage(
  message: string,
  isAuthenticated: boolean
): string {
  if (isAuthenticated) return message;

  // 커밋 타입 추출 후 카테고리로 변환
  const firstLine = message.split("\n")[0].toLowerCase();
  if (firstLine.startsWith("feat")) return "기능 추가";
  if (firstLine.startsWith("fix")) return "버그 수정";
  if (firstLine.startsWith("refactor")) return "코드 개선";
  if (firstLine.startsWith("style")) return "스타일 수정";
  if (firstLine.startsWith("docs")) return "문서 업데이트";
  if (firstLine.startsWith("test")) return "테스트 추가";
  if (firstLine.startsWith("chore")) return "설정 변경";
  if (firstLine.startsWith("perf")) return "성능 개선";
  if (firstLine.startsWith("build")) return "빌드 설정";
  if (firstLine.startsWith("ci")) return "CI/CD 설정";
  return "코드 업데이트";
}

// 커밋 URL 마스킹
export function maskCommitUrl(
  url: string,
  isAuthenticated: boolean
): string | null {
  return isAuthenticated ? url : null;
}

// 개발자명 마스킹
export function maskAuthorName(
  name: string,
  authorIndex: number,
  isAuthenticated: boolean
): string {
  if (isAuthenticated) return name;
  return `개발자 ${indexToAlpha(authorIndex)}`; // A, B, C... AA, AB...
}

// 글 본문 마스킹 (repositoryName, displayName → maskName 또는 Repository A 치환)
export function maskContent(
  content: string | null,
  mappings: ProjectMappingsMap,
  isAuthenticated: boolean,
  repoIndexMap?: Map<string, number>,
  commitRepositories?: string[] // 커밋에서 가져온 실제 리포지토리명 목록
): string | null {
  if (!content) return content;
  if (isAuthenticated) return content;

  let maskedContent = content;

  // 더 긴 문자열부터 치환 (부분 매칭 방지)
  const replacements: { from: string; to: string }[] = [];

  // 1. DB에 등록된 프로젝트 매핑 처리
  const mappingEntries = Array.from(mappings.entries());
  mappingEntries.forEach(([repositoryName, { displayName, maskName }]) => {
    const index = repoIndexMap?.get(repositoryName) ?? 0;
    const maskedName = maskName || `Repository ${indexToAlpha(index)}`;

    // displayName → maskedName
    if (displayName) {
      replacements.push({ from: displayName, to: maskedName });
    }
    // repositoryName → maskedName (displayName과 다른 경우에만)
    if (repositoryName !== displayName) {
      replacements.push({ from: repositoryName, to: maskedName });
    }
  });

  // 2. 커밋에 있지만 DB 매핑에 없는 리포지토리명도 치환
  if (commitRepositories) {
    commitRepositories.forEach((repoName) => {
      // 이미 매핑에 있으면 스킵
      if (mappings.has(repoName)) return;

      const index = repoIndexMap?.get(repoName) ?? 0;
      const maskedName = `Repository ${indexToAlpha(index)}`;

      // 이미 동일한 from이 있는지 확인
      if (!replacements.find((r) => r.from === repoName)) {
        replacements.push({ from: repoName, to: maskedName });
      }
    });
  }

  // 긴 문자열부터 치환 (부분 매칭 방지)
  replacements.sort((a, b) => b.from.length - a.from.length);

  replacements.forEach(({ from, to }) => {
    maskedContent = maskedContent!.replaceAll(from, to);
  });

  return maskedContent;
}

// 커밋 데이터 타입
interface CommitData {
  id: string;
  repository: string;
  message: string;
  author: string;
  authorEmail?: string | null;
  authorAvatar: string | null;
  additions: number;
  deletions: number;
  url: string;
  committedAt?: Date;
  filesChanged?: number;
}

// 마스킹된 커밋 타입
interface MaskedCommit {
  id: string;
  repository: string;
  message: string;
  author: string;
  authorEmail?: string | null;
  authorAvatar: string | null;
  additions: number;
  deletions: number;
  url: string | null;
  committedAt?: Date;
  filesChanged?: number;
}

// 포스트 데이터 타입
interface PostData {
  id: string;
  targetDate: Date;
  title: string | null;
  content: string | null;
  summary: string | null;
  slug: string | null;
  publishedAt: Date | null;
  commits: CommitData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// 마스킹된 포스트 타입
interface MaskedPost {
  id: string;
  targetDate: Date;
  title: string | null;
  content: string | null;
  summary: string | null;
  slug: string | null;
  publishedAt: Date | null;
  commits: MaskedCommit[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// 개별 포스트에 마스킹 적용
export function applyPostMasking(
  post: PostData,
  mappings: ProjectMappingsMap,
  isAuthenticated: boolean,
  globalRepoIndexMap?: AllRepositoriesMap // 전역 리포지토리 인덱스 맵
): MaskedPost {
  // 고유 저자 목록 생성 (인덱스 매핑용)
  const uniqueAuthors = [...new Set(post.commits.map((c) => c.author))];
  const authorIndexMap = new Map(uniqueAuthors.map((a, i) => [a, i]));

  // 커밋의 리포지토리명 목록 (중복 제거)
  const commitRepositories = [...new Set(post.commits.map((c) => c.repository))];

  // 리포지토리 인덱스 맵: 전역 맵 우선 사용, 없으면 로컬 생성
  const repoIndexMap = globalRepoIndexMap || createRepositoryIndexMap(commitRepositories);

  return {
    ...post,
    title: post.title,
    content: maskContent(
      post.content,
      mappings,
      isAuthenticated,
      repoIndexMap,
      commitRepositories
    ),
    summary: maskContent(
      post.summary,
      mappings,
      isAuthenticated,
      repoIndexMap,
      commitRepositories
    ),
    commits: post.commits.map((commit) => ({
      ...commit,
      repository: maskProjectName(
        commit.repository,
        mappings,
        isAuthenticated,
        repoIndexMap
      ),
      message: maskCommitMessage(commit.message, isAuthenticated),
      author: maskAuthorName(
        commit.author,
        authorIndexMap.get(commit.author) || 0,
        isAuthenticated
      ),
      authorAvatar: isAuthenticated ? commit.authorAvatar : null,
      url: maskCommitUrl(commit.url, isAuthenticated),
    })),
  };
}

// 포스트 목록에 마스킹 적용
export async function applyPostListMasking(
  posts: PostData[],
  isAuthenticated: boolean
): Promise<MaskedPost[]> {
  // Repository 테이블 기반 전역 인덱스 맵 사용
  const [mappings, globalRepoIndexMap] = await Promise.all([
    getProjectMappings(),
    getAllRepositoriesIndexMap(),
  ]);
  return posts.map((post) => applyPostMasking(post, mappings, isAuthenticated, globalRepoIndexMap));
}

// 단일 포스트에 마스킹 적용 (async 버전)
export async function applyPostMaskingAsync(
  post: PostData,
  isAuthenticated: boolean
): Promise<MaskedPost> {
  // Repository 테이블 기반 전역 인덱스 맵 사용
  const [mappings, globalRepoIndexMap] = await Promise.all([
    getProjectMappings(),
    getAllRepositoriesIndexMap(),
  ]);
  return applyPostMasking(post, mappings, isAuthenticated, globalRepoIndexMap);
}
