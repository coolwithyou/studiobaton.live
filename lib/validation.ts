import { z } from "zod";

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

export const postUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(50000).optional(),
  summary: z.string().max(500).optional(),
  action: z.enum(["publish", "save"]).optional(),
  versionId: z.string().cuid().optional(),
});

export const postQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: postStatusSchema.optional(),
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
    (date) => date <= new Date(),
    "미래 날짜는 선택할 수 없습니다."
  ),
  memberId: z.string().cuid("유효한 팀원 ID를 선택해주세요."),
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
