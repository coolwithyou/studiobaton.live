import DOMPurify from "isomorphic-dompurify";

/**
 * HTML 콘텐츠에서 잠재적으로 위험한 스크립트를 제거합니다.
 * 마크다운에서 변환된 HTML이나 사용자 입력 콘텐츠에 사용합니다.
 */
export function sanitizeHtml(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      // 텍스트 서식
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "s",
      "del",
      "ins",
      "mark",
      "small",
      "sub",
      "sup",
      // 헤딩
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      // 리스트
      "ul",
      "ol",
      "li",
      // 링크 및 미디어
      "a",
      "img",
      // 코드
      "pre",
      "code",
      "kbd",
      "samp",
      // 인용
      "blockquote",
      "q",
      "cite",
      // 테이블
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      // 구조
      "div",
      "span",
      "hr",
      // 정의 리스트
      "dl",
      "dt",
      "dd",
      // 기타
      "abbr",
      "details",
      "summary",
      "figure",
      "figcaption",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "target",
      "rel",
      "width",
      "height",
      "colspan",
      "rowspan",
      "scope",
      "lang",
      "dir",
      "open",
      // 코드 하이라이팅용
      "data-language",
      "data-line",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

/**
 * 마크다운 콘텐츠를 정리합니다.
 * 마크다운 내에 포함된 HTML 태그를 제거합니다.
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
