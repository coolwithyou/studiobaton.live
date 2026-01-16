/**
 * 마크다운 콘텐츠를 정리합니다.
 * 마크다운 내에 포함된 HTML 태그를 제거합니다.
 *
 * 이 함수는 jsdom이나 DOMPurify를 사용하지 않으므로
 * 서버 사이드에서 ESM/CommonJS 호환성 문제 없이 안전하게 사용 가능합니다.
 */
export function sanitizeMarkdown(content: string): string {
  // 위험한 HTML 패턴 제거
  let sanitized = content;

  // script 태그 제거
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // on* 이벤트 핸들러 제거
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");

  // javascript: 프로토콜 제거
  sanitized = sanitized.replace(/javascript:/gi, "");

  // data: 프로토콜 (이미지 제외) 제거
  sanitized = sanitized.replace(/data:(?!image\/)/gi, "");

  // iframe, object, embed 태그 제거
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^>]*>/gi, "");
  sanitized = sanitized.replace(/<\/(iframe|object|embed)>/gi, "");

  // style 태그 제거
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  return sanitized;
}

/**
 * 플레인 텍스트를 이스케이프합니다.
 * HTML 태그가 텍스트로 표시되도록 합니다.
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}
