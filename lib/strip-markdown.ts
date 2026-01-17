/**
 * 마크다운 문법을 제거하여 순수 텍스트만 추출합니다.
 * 오픈그래프 설명, 요약 미리보기 등에 사용됩니다.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // 제목 (# ## ### 등)
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 볼드 **text**
    .replace(/\*([^*]+)\*/g, "$1") // 이탤릭 *text*
    .replace(/__([^_]+)__/g, "$1") // 볼드 __text__
    .replace(/_([^_]+)_/g, "$1") // 이탤릭 _text_
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // 인라인 코드 및 코드 블록
    .replace(/^\s*[-*+]\s+/gm, "") // 리스트 아이템
    .replace(/^\s*\d+\.\s+/gm, "") // 숫자 리스트
    .replace(/^\s*>\s+/gm, "") // 인용문
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 링크 [text](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // 이미지 ![alt](url)
    .replace(/\n+/g, " ") // 줄바꿈을 공백으로
    .replace(/\s+/g, " ") // 연속 공백 정리
    .trim();
}
