import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { codeToHast } from "shiki";
import { visit } from "unist-util-visit";
import type { Root, Element, Text, Parents } from "hast";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// GIF 판별
function isGif(src: string): boolean {
  return src.includes("giphy.com") || src.endsWith(".gif");
}

// 이미지 크기 파싱 유틸리티 (alt|크기 형식에서 크기 추출)
// 예: "설명|100%" -> { altText: "설명", size: "100%" }
// 예: "설명" -> { altText: "설명", size: null }
function parseImageSize(alt: string | undefined): { altText: string; size: string | null } {
  if (!alt) return { altText: "", size: null };

  const match = alt.match(/^(.+?)\|(\d+%?)$/);
  if (match) {
    return { altText: match[1].trim(), size: match[2] };
  }
  return { altText: alt, size: null };
}

// 크기 값을 CSS max-width 값으로 변환 (인라인 스타일용)
// Tailwind JIT는 동적 클래스를 스캔하지 못하므로 인라인 스타일 사용
function getMaxWidthValue(size: string | null, isGifImage: boolean): string {
  if (size) {
    return size.endsWith("%") ? size : `${size}%`;
  }
  return isGifImage ? "50%" : "100%";
}

// 코드 블록 Shiki 처리 플러그인
function rehypeShiki() {
  return async (tree: Root) => {
    const promises: Promise<void>[] = [];

    visit(tree, "element", (node: Element, index, parent: Parents | undefined) => {
      if (
        node.tagName === "pre" &&
        node.children[0]?.type === "element" &&
        (node.children[0] as Element).tagName === "code"
      ) {
        const codeNode = node.children[0] as Element;
        const classNames = (codeNode.properties?.className as string[]) || [];
        const lang =
          classNames
            .find((c) => c.startsWith("language-"))
            ?.replace("language-", "") || "text";
        const textNode = codeNode.children[0] as Text | undefined;
        const code = textNode?.value || "";

        promises.push(
          codeToHast(code, {
            lang,
            themes: { light: "github-light", dark: "github-dark" },
            defaultColor: false,
          }).then((hast) => {
            if (parent && typeof index === "number" && "children" in parent) {
              // codeToHast는 Root를 반환하는데, 그 안의 pre 요소를 가져와야 함
              const preElement = (hast as Root).children[0] as Element;
              // shiki-wrapper div로 감싸기
              const wrapperDiv: Element = {
                type: "element",
                tagName: "div",
                properties: {
                  className: "shiki-wrapper rounded-lg overflow-x-auto my-4 text-sm [&>pre]:p-4 [&>pre]:m-0",
                },
                children: [preElement],
              };
              (parent.children as Element[])[index] = wrapperDiv;
            }
          })
        );
      }
    });

    await Promise.all(promises);
  };
}

// 이미지를 p 태그에서 분리하는 플러그인
// 마크다운의 ![alt](url) 형식 이미지가 <p><img /></p>로 변환되는데,
// 커스텀 img 컴포넌트에서 <figure>를 반환하면 <p><figure>...</figure></p>가 되어
// 잘못된 HTML 중첩이 발생함. 이를 방지하기 위해 단독 이미지를 p에서 분리함.
function rehypeUnwrapImages() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent: Parents | undefined) => {
      if (
        node.tagName === "p" &&
        parent &&
        typeof index === "number" &&
        "children" in parent
      ) {
        // p 태그의 자식 중 의미있는 노드만 필터링 (공백 텍스트 제외)
        const meaningfulChildren = node.children.filter((child) => {
          if (child.type === "text" && (child as Text).value.trim() === "") {
            return false;
          }
          return true;
        });

        // p 태그가 단일 img 요소만 포함하는 경우
        if (
          meaningfulChildren.length === 1 &&
          meaningfulChildren[0].type === "element" &&
          (meaningfulChildren[0] as Element).tagName === "img"
        ) {
          // p 태그를 img로 교체 (unwrap)
          (parent.children as Element[])[index] = meaningfulChildren[0] as Element;
        }
      }
    });
  };
}

// 이미지 스타일 처리 플러그인 (HTML로 직접 작성된 figure/figcaption만 처리)
function rehypeImageStyles() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      // figure 스타일 처리 (HTML로 직접 작성된 경우)
      if (node.tagName === "figure") {
        const existingClass = node.properties?.className;
        const classArray: string[] = Array.isArray(existingClass)
          ? existingClass.filter((c): c is string => typeof c === "string")
          : typeof existingClass === "string"
            ? [existingClass]
            : [];
        node.properties = {
          ...node.properties,
          className: [...classArray, "!text-center", "!my-6"].join(" "),
        };

        // figure 내부의 img에 스타일 적용 (figure 자식으로 있는 경우에만)
        for (const child of node.children) {
          if (child.type === "element" && (child as Element).tagName === "img") {
            const imgNode = child as Element;
            const src = imgNode.properties?.src as string;
            const imgExistingClass = imgNode.properties?.className;
            const imgClassArray: string[] = Array.isArray(imgExistingClass)
              ? imgExistingClass.filter((c): c is string => typeof c === "string")
              : typeof imgExistingClass === "string"
                ? [imgExistingClass]
                : [];
            const isGifImage = src && isGif(src);
            imgNode.properties = {
              ...imgNode.properties,
              className: [
                ...imgClassArray,
                "!inline-block",
                "!h-auto",
                "!m-0",
                isGifImage ? "!max-w-[50%]" : "!max-w-full",
              ].join(" "),
            };
          }
        }
      }

      // figcaption 스타일 처리 (HTML로 직접 작성된 경우)
      if (node.tagName === "figcaption") {
        const existingClass = node.properties?.className;
        const classArray: string[] = Array.isArray(existingClass)
          ? existingClass.filter((c): c is string => typeof c === "string")
          : typeof existingClass === "string"
            ? [existingClass]
            : [];
        node.properties = {
          ...node.properties,
          className: [...classArray, "!text-sm", "!opacity-70", "!mt-2"].join(" "),
        };
      }
    });
  };
}

// 커스텀 JSX 컴포넌트
function createComponents() {
  return {
    img: ({
      src,
      alt,
      className,
      ...props
    }: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const srcStr = typeof src === "string" ? src : "";
      const isGifImage = isGif(srcStr);
      const classStr = typeof className === "string" ? className : "";

      // 이미 figure 내부에서 스타일이 적용된 이미지 (HTML로 직접 작성된 경우)
      // rehypeImageStyles에서 !important 클래스를 추가했으므로 이를 체크
      if (classStr.includes("!inline-block") || classStr.includes("!max-w-")) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || ""}
            className={classStr}
            {...props}
          />
        );
      }

      // 마크다운 ![alt|크기](url) 형식 파싱 - 크기 지정 지원
      const { altText, size } = parseImageSize(alt);
      const maxWidth = getMaxWidthValue(size, isGifImage);

      // 마크다운 ![alt](url) 형식 이미지 - figure로 감싸서 가운데 정렬 + 캡션
      // !important 적용으로 prose 스타일 덮어쓰기
      return (
        <figure className="!text-center !my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={altText || ""}
            className="!inline-block !h-auto !m-0"
            style={{ maxWidth }}
            {...props}
          />
          {altText && altText !== "GIF" && altText.trim() !== "" && (
            <figcaption className="!text-sm !opacity-70 !mt-2">{altText}</figcaption>
          )}
        </figure>
      );
    },
    // 인라인 코드 스타일
    code: ({
      className,
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement>) => {
      // 코드 블록은 Shiki가 처리하므로 인라인 코드만 처리
      if (!className) {
        return (
          <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };
}

export async function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug) // 헤딩에 id 자동 부여 (TOC용)
    .use(rehypeUnwrapImages) // 단독 이미지를 p 태그에서 분리
    .use(rehypeImageStyles)
    .use(rehypeShiki);

  const mdast = processor.parse(content);
  const hast = await processor.run(mdast);

  const jsxContent = toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    components: createComponents(),
  });

  return <div className={className}>{jsxContent}</div>;
}
