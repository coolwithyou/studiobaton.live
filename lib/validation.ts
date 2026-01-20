import { z } from "zod";
import { startOfDayKST, nowKST } from "@/lib/date-utils";

/**
 * 공통 스키마
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.startDate <= data.endDate, {
  message: "시작일은 종료일보다 이전이어야 합니다.",
});

/**
 * 포스트 관련 스키마
 */
export const postStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const postTypeSchema = z.enum(["COMMIT_BASED", "MANUAL"]);

export const slugSchema = z
  .string()
  .min(1, "URL slug를 입력해주세요.")
  .max(100, "URL slug는 100자 이내여야 합니다.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "URL slug는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다."
  );

export const postUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(50000).optional(),
  summary: z.string().max(500).optional(),
  slug: slugSchema.optional(),
  action: z.enum(["publish", "unpublish", "save"]).optional(),
  versionId: z.string().cuid().optional(),
});

export const postQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: postStatusSchema.optional(),
  type: postTypeSchema.optional(),
  category: z.string().max(50).optional(),
});

/**
 * 수동 포스트 관련 스키마
 */
export const manualPostCreateSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(200),
  content: z.string().min(1, "내용을 입력해주세요.").max(100000),
  summary: z.string().max(500).optional(),
  slug: slugSchema,
  category: z.string().max(50).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  showInTimeline: z.boolean().default(false), // 타임라인 노출 여부 (기본: 표시 안 함)
});

export const manualPostUpdateSchema = manualPostCreateSchema.partial().extend({
  id: z.string().cuid(),
});

/**
 * 프로젝트 매핑 관련 스키마
 */
export const repositoryNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "리포지토리명은 영문, 숫자, '.', '_', '-'만 사용 가능합니다."
  );

export const projectMappingSchema = z.object({
  repositoryName: repositoryNameSchema,
  displayName: z.string().min(1).max(100),
  maskName: z.string().max(100).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const projectMappingUpdateSchema = projectMappingSchema.partial().extend({
  id: z.string().cuid(),
});

/**
 * 글 생성 관련 스키마
 */
export const generatePostSchema = z.object({
  date: z.coerce.date().refine(
    (date) => date <= new Date(),
    "미래 날짜는 선택할 수 없습니다."
  ),
  forceRegenerate: z.boolean().default(false),
});

export const batchGenerateSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  excludeHolidays: z.boolean().default(true),
  excludeWeekends: z.boolean().default(false),
  minCommitCount: z.number().int().min(0).default(1),
}).refine((data) => data.startDate <= data.endDate, {
  message: "시작일은 종료일보다 이전이어야 합니다.",
}).refine((data) => data.endDate <= new Date(), {
  message: "종료일은 오늘 이전이어야 합니다.",
});

/**
 * 인증 관련 스키마
 */
export const loginSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

/**
 * 검색 관련 스키마
 */
export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: postStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * 통계 관련 스키마
 */
export const statsQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
}).refine((data) => data.startDate <= data.endDate, {
  message: "시작일은 종료일보다 이전이어야 합니다.",
});

/**
 * 팀원 관련 스키마
 */
export const memberSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요.").max(50),
  githubName: z.string().min(1, "GitHub 사용자명을 입력해주세요.").max(100),
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  avatarUrl: z
    .string()
    .transform((val) => (val === "" ? null : val))
    .pipe(z.string().url("유효한 URL을 입력해주세요.").nullable())
    .optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const memberUpdateSchema = memberSchema.partial().extend({
  id: z.string().cuid(),
});

/**
 * 커밋 리뷰 관련 스키마
 */
export const reviewQuerySchema = z.object({
  date: z.coerce.date().refine(
    (date) => startOfDayKST(date) <= startOfDayKST(nowKST()),
    "미래 날짜는 선택할 수 없습니다."
  ),
  memberId: z.string().cuid("유효한 팀원 ID를 선택해주세요."),
});

/**
 * 스탠드업 관련 스키마
 */
export const standupQuerySchema = z.object({
  date: z.coerce.date().refine(
    (date) => startOfDayKST(date) <= startOfDayKST(nowKST()),
    "미래 날짜는 선택할 수 없습니다."
  ),
  memberId: z.string().cuid("유효한 팀원 ID를 선택해주세요."),
});

export const standupTaskSchema = z.object({
  date: z.coerce.date(),
  memberId: z.string().cuid(),
  content: z.string()
    .min(1, "할 일 내용을 입력해주세요.")
    .max(500, "500자 이내로 입력해주세요."),
  repository: z.string().max(200).nullable().optional(),
});

export const standupTaskUpdateSchema = z.object({
  isCompleted: z.boolean().optional(),
  content: z.string().min(1).max(500).optional(),
  repository: z.string().max(200).nullable().optional(),
});

export const repoSearchSchema = z.object({
  q: z.string().max(100).default(""),
});

export const commitSummarizeSchema = z.object({
  date: z.coerce.date(),
  memberId: z.string().cuid(),
  regenerate: z.boolean().optional().default(false),
});

/**
 * 유효성 검사 헬퍼
 */
export function parseSearchParams<T extends z.ZodType>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}

export function parseJson<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * 사용자(Admin) 관련 스키마
 */
export const userRoleSchema = z.enum(["ADMIN", "TEAM_MEMBER", "ORG_MEMBER"]);
export const userStatusSchema = z.enum(["PENDING", "ACTIVE", "INACTIVE"]);

export const userQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().int().positive().default(1)
  ),
  limit: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().int().min(1).max(100).default(20)
  ),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  search: z.string().optional(),
});

export const userUpdateSchema = z.object({
  id: z.string().cuid(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});

/**
 * 사이드 메뉴 관련 스키마
 */
export const linkTypeSchema = z.enum(["INTERNAL", "EXTERNAL", "POST_CATEGORY"]);

export const sideMenuSectionCreateSchema = z.object({
  title: z.string().min(1, "섹션 제목을 입력해주세요.").max(50),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const sideMenuSectionUpdateSchema = sideMenuSectionCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export const sideMenuItemCreateSchema = z.object({
  sectionId: z.string().cuid("유효한 섹션 ID를 선택해주세요."),
  title: z.string().min(1, "메뉴 제목을 입력해주세요.").max(50),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  linkType: linkTypeSchema.default("INTERNAL"),
  internalPath: z.string().max(200).optional(),
  externalUrl: z.string().url("유효한 URL을 입력해주세요.").optional(),
  postCategory: z.string().max(50).optional(),
}).refine(
  (data) => {
    // 링크 타입에 따라 필수 필드 검증
    if (data.linkType === "INTERNAL" && !data.internalPath) {
      return false;
    }
    if (data.linkType === "EXTERNAL" && !data.externalUrl) {
      return false;
    }
    if (data.linkType === "POST_CATEGORY" && !data.postCategory) {
      return false;
    }
    return true;
  },
  {
    message: "링크 타입에 맞는 경로 또는 URL을 입력해주세요.",
  }
);

export const sideMenuItemUpdateSchema = z.object({
  id: z.string().cuid(),
  sectionId: z.string().cuid().optional(),
  title: z.string().min(1).max(50).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  linkType: linkTypeSchema.optional(),
  internalPath: z.string().max(200).nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  postCategory: z.string().max(50).nullable().optional(),
});

export const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().cuid(),
    displayOrder: z.number().int().min(0),
  })),
});

/**
 * Zod 에러를 읽기 쉬운 메시지로 변환
 */
export function formatZodError(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".") || "_root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  });

  return formatted;
}
