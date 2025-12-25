/**
 * 애플리케이션 전역 에러 클래스
 */

// 기본 API 에러
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// 인증 관련 에러
export class AuthError extends ApiError {
  constructor(message: string = "인증이 필요합니다.", code: string = "UNAUTHORIZED") {
    super(code, message, 401);
    this.name = "AuthError";
  }
}

// 권한 에러
export class ForbiddenError extends ApiError {
  constructor(message: string = "접근 권한이 없습니다.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

// 리소스 미발견 에러
export class NotFoundError extends ApiError {
  constructor(resource: string = "리소스") {
    super("NOT_FOUND", `${resource}를 찾을 수 없습니다.`, 404);
    this.name = "NotFoundError";
  }
}

// 유효성 검증 에러
export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

// 중복 리소스 에러
export class ConflictError extends ApiError {
  constructor(message: string = "이미 존재하는 리소스입니다.") {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

// 외부 서비스 에러 (GitHub API, Claude API 등)
export class ExternalServiceError extends ApiError {
  constructor(
    service: string,
    message: string,
    public originalError?: unknown
  ) {
    super("EXTERNAL_SERVICE_ERROR", `${service}: ${message}`, 502);
    this.name = "ExternalServiceError";
  }
}

// 데이터베이스 에러
export class DatabaseError extends ApiError {
  constructor(message: string = "데이터베이스 오류가 발생했습니다.") {
    super("DATABASE_ERROR", message, 500);
    this.name = "DatabaseError";
  }
}

// Rate Limit 에러
export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super("RATE_LIMIT_EXCEEDED", "요청 한도를 초과했습니다.", 429, {
      retryAfter,
    });
    this.name = "RateLimitError";
  }
}

/**
 * 에러를 적절한 타입으로 변환
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    // Prisma 에러 처리
    if (error.name === "PrismaClientKnownRequestError") {
      const prismaError = error as Error & { code?: string };
      if (prismaError.code === "P2002") {
        return new ConflictError("중복된 데이터가 존재합니다.");
      }
      if (prismaError.code === "P2025") {
        return new NotFoundError("레코드");
      }
      return new DatabaseError(error.message);
    }

    return new ApiError("INTERNAL_ERROR", error.message);
  }

  return new ApiError("UNKNOWN_ERROR", "알 수 없는 오류가 발생했습니다.");
}

/**
 * 에러 로깅 유틸리티
 */
export function logError(context: string, error: unknown): void {
  const normalizedError = normalizeError(error);

  console.error(`[${context}]`, {
    code: normalizedError.code,
    message: normalizedError.message,
    status: normalizedError.status,
    details: normalizedError.details,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
