import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
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

// 이미지 스타일 처리 플러그인
function rehypeImageStyles() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      // figure 스타일 처리
      if (node.tagName === "figure") {
        const existingClass = node.properties?.className;
        const classArray: string[] = Array.isArray(existingClass)
          ? existingClass.filter((c): c is string => typeof c === "string")
          : typeof existingClass === "string"
            ? [existingClass]
            : [];
        node.properties = {
          ...node.properties,
          className: [...classArray, "text-center", "my-6"].join(" "),
        };
      }

      // figcaption 스타일 처리
      if (node.tagName === "figcaption") {
        const existingClass = node.properties?.className;
        const classArray: string[] = Array.isArray(existingClass)
          ? existingClass.filter((c): c is string => typeof c === "string")
          : typeof existingClass === "string"
            ? [existingClass]
            : [];
        node.properties = {
          ...node.properties,
          className: [...classArray, "text-sm", "opacity-70", "mt-2"].join(" "),
        };
      }

      // figure 내부의 GIF 이미지 스타일 처리
      if (node.tagName === "img") {
        const src = node.properties?.src as string;
        if (src && isGif(src)) {
          const existingClass = node.properties?.className;
          const classArray: string[] = Array.isArray(existingClass)
            ? existingClass.filter((c): c is string => typeof c === "string")
            : typeof existingClass === "string"
              ? [existingClass]
              : [];
          node.properties = {
            ...node.properties,
            className: [...classArray, "inline-block", "max-w-[50%]", "h-auto"].join(" "),
          };
        }
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

      // GIF 이미지이면서 아직 스타일이 적용되지 않은 경우 (마크다운 ![alt](url) 형식)
      if (isGifImage && !classStr.includes("max-w-[50%]")) {
        return (
          <figure className="text-center my-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || "GIF"}
              className="inline-block max-w-[50%] h-auto"
              {...props}
            />
            {alt && alt !== "GIF" && (
              <figcaption className="text-sm opacity-70 mt-2">{alt}</figcaption>
            )}
          </figure>
        );
      }

      // 일반 이미지
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || ""}
          className={classStr || "max-w-full h-auto"}
          {...props}
        />
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
