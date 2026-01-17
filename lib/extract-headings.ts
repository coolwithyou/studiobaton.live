import GithubSlugger from "github-slugger";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
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
    const text = match[2].trim();
    const id = slugger.slug(text);

    headings.push({ id, text, level });
  }

  return headings;
}
