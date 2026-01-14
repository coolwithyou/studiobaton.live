"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "마크다운으로 내용을 입력하세요...",
  minHeight = 400,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  if (disabled) {
    // 발행된 글은 마크다운 렌더링으로 표시
    return (
      <div
        data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
        className="border rounded-md p-6 bg-muted/30 min-h-[400px]"
      >
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                // 인라인 코드인 경우
                if (!className) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                }
                // 코드 블록인 경우
                return (
                  <code className={`${className} block bg-muted p-4 rounded-lg overflow-x-auto text-sm`} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <>{children}</>,
            }}
          >
            {value || placeholder}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        preview="live"
        height={minHeight}
        textareaProps={{
          placeholder,
        }}
      />
    </div>
  );
}
