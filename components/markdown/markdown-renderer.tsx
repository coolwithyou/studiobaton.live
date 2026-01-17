import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { codeToHtml } from "shiki";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export async function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            const srcStr = typeof src === "string" ? src : "";
            const isGif = srcStr.includes("giphy.com") || srcStr.endsWith(".gif");
            if (isGif) {
              return (
                <figure className="text-center my-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={alt || "GIF"}
                    className="inline-block max-w-[50%] h-auto"
                  />
                  {alt && alt !== "GIF" && (
                    <figcaption className="text-sm opacity-70 mt-2">
                      {alt}
                    </figcaption>
                  )}
                </figure>
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt || ""} className="max-w-full h-auto" />
            );
          },
          code: async ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "text";
            const codeString = String(children).replace(/\n$/, "");

            // 인라인 코드인 경우 (줄바꿈 없음)
            if (!className) {
              return (
                <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }

            // 코드 블록인 경우 Shiki로 하이라이팅
            try {
              const html = await codeToHtml(codeString, {
                lang,
                themes: {
                  light: "github-light",
                  dark: "github-dark",
                },
                defaultColor: false,
              });

              return (
                <div
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="shiki-wrapper rounded-lg overflow-x-auto my-4 text-sm [&>pre]:p-4 [&>pre]:m-0"
                />
              );
            } catch {
              // Shiki가 지원하지 않는 언어인 경우 기본 스타일 적용
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          },
          pre: ({ children }) => {
            // pre 태그는 code 컴포넌트에서 처리하므로 children만 반환
            return <>{children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
