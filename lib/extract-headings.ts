import GithubSlugger from "github-slugger";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

/**
 * 헤딩 텍스트에서 마크다운 문법과 HTML 태그를 제거합니다.
 */
function stripHeadingMarkdown(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // HTML 태그 제거 <tag>, </tag>, <tag />
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 볼드 **text**
    .replace(/\*([^*]+)\*/g, "$1") // 이탤릭 *text*
    .replace(/__([^_]+)__/g, "$1") // 볼드 __text__
    .replace(/_([^_]+)_/g, "$1") // 이탤릭 _text_
    .replace(/`([^`]+)`/g, "$1") // 인라인 코드 `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 링크 [text](url)
    .replace(/~~([^~]+)~~/g, "$1") // 취소선 ~~text~~
    .trim();
}

/**
 * 마크다운 콘텐츠에서 헤딩(h1~h3)을 추출합니다.
 * rehype-slug와 동일한 github-slugger를 사용하여 id를 생성합니다.
 */
export function extractHeadings(content: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: TocHeading[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();
    const text = stripHeadingMarkdown(rawText);
    const id = slugger.slug(rawText); // id는 원본 텍스트 기준으로 생성 (rehype-slug와 일치)

    headings.push({ id, text, level });
  }

  return headings;
}
