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

/**
 * Anthropic API 요금 (2025년 1월 기준, USD per Million Tokens)
 */
export const MODEL_PRICING = {
  "claude-sonnet-4-5-20250929": {
    inputPerMTok: 3,   // $3 per million input tokens
    outputPerMTok: 15, // $15 per million output tokens
  },
  "claude-opus-4-5-20251101": {
    inputPerMTok: 5,   // $5 per million input tokens
    outputPerMTok: 25, // $25 per million output tokens
  },
} as const;

/**
 * 커밋 수 기반 토큰 추정
 * - 입력: 시스템 프롬프트(~500) + 커밋 데이터(커밋당 ~100토큰) + 한글 배율(2.36x)
 * - 출력: calculateContentLength의 maxTokens 사용
 */
export function estimateTokens(commitCount: number): {
  inputTokens: number;
  outputTokens: number;
} {
  // 기본 시스템 프롬프트 토큰 (한글 배율 적용)
  const basePromptTokens = Math.round(500 * 2.36);
  // 커밋당 평균 토큰 (메시지 + 파일 정보, 한글 배율)
  const tokensPerCommit = Math.round(100 * 2.36);

  const inputTokens = basePromptTokens + commitCount * tokensPerCommit;

  // 출력 토큰은 calculateContentLength 로직과 동일
  let outputTokens: number;
  if (commitCount <= 5) {
    outputTokens = 512;
  } else if (commitCount <= 15) {
    outputTokens = 1024;
  } else if (commitCount <= 30) {
    outputTokens = 1536;
  } else {
    outputTokens = 2048;
  }

  return { inputTokens, outputTokens };
}

/**
 * 예상 요금 계산
 */
export function estimateCost(
  commitCount: number,
  model: AIModel
): { usd: number; krw: number } {
  const { inputTokens, outputTokens } = estimateTokens(commitCount);
  const pricing = MODEL_PRICING[model];

  // Million tokens 단위로 변환하여 계산
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTok;
  const totalUsd = inputCost + outputCost;

  // 환율 적용 (약 1,470원/USD 기준)
  const totalKrw = Math.round(totalUsd * 1470);

  return {
    usd: Math.round(totalUsd * 10000) / 10000, // 소수점 4자리
    krw: totalKrw,
  };
}

/**
 * 요금 포맷 함수
 */
export function formatCost(cost: { usd: number; krw: number }): string {
  if (cost.krw < 1) {
    return `~${(cost.usd * 100).toFixed(2)}¢`;
  }
  return `~₩${cost.krw.toLocaleString()}`;
}
