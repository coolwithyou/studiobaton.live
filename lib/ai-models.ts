/**
 * AI 모델 설정 (클라이언트/서버 공통)
 *
 * 이 파일은 서버 전용 모듈을 import하지 않으므로
 * 클라이언트 컴포넌트에서 안전하게 import할 수 있습니다.
 */

/**
 * 사용 가능한 AI 모델 목록
 * 엔지니어링 블로그 품질을 위해 상위 모델만 제공 (Haiku 제외)
 */
export const AVAILABLE_MODELS = {
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5 (기본, 속도+가성비)",
  "claude-opus-4-5-20251101": "Claude Opus 4.5 (최고 품질)",
} as const;

export type AIModel = keyof typeof AVAILABLE_MODELS;

export const DEFAULT_MODEL: AIModel = "claude-sonnet-4-5-20250929";
