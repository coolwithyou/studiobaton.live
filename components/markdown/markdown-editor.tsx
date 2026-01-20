"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GiphyPickerDialog } from "@/components/giphy/giphy-picker-dialog";
import type { ICommand } from "@uiw/react-md-editor";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

// GIF 아이콘 컴포넌트
function GifIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        GIF
      </text>
    </svg>
  );
}

// GIF 이미지 마크다운 생성 (data-gif 속성으로 구분)
function createGifMarkdown(gifUrl: string, altText: string): string {
  const caption = altText.trim() || "GIF";
  // 마크다운 이미지 문법 사용 (렌더러에서 스타일 적용)
  return `![${caption}](${gifUrl})`;
}

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
  const [giphyOpen, setGiphyOpen] = useState(false);
  const cursorPositionRef = useRef<number>(value.length);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // 에디터 textarea의 커서 위치 추적
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleSelectionChange = () => {
      const textarea = container.querySelector("textarea");
      if (textarea && document.activeElement === textarea) {
        cursorPositionRef.current = textarea.selectionStart;
      }
    };

    // 클릭, 키 입력 시 커서 위치 업데이트
    container.addEventListener("click", handleSelectionChange);
    container.addEventListener("keyup", handleSelectionChange);

    return () => {
      container.removeEventListener("click", handleSelectionChange);
      container.removeEventListener("keyup", handleSelectionChange);
    };
  }, []);

  // GIF 삽입 핸들러 - 커서 위치에 삽입
  const handleGifInsert = useCallback(
    (gifUrl: string, altText: string) => {
      const gifMarkdown = createGifMarkdown(gifUrl, altText);
      const pos = cursorPositionRef.current;

      // 커서 위치에 삽입
      const before = value.slice(0, pos);
      const after = value.slice(pos);

      // 앞뒤로 줄바꿈 추가 (이미 줄바꿈이 있으면 생략)
      const needNewlineBefore = before.length > 0 && !before.endsWith("\n");
      const needNewlineAfter = after.length > 0 && !after.startsWith("\n");

      const newValue =
        before +
        (needNewlineBefore ? "\n\n" : "") +
        gifMarkdown +
        (needNewlineAfter ? "\n\n" : "") +
        after;

      onChange(newValue);
    },
    [value, onChange]
  );

  // GIF 커스텀 커맨드
  const gifCommand: ICommand = useMemo(
    () => ({
      name: "gif",
      keyCommand: "gif",
      buttonProps: {
        "aria-label": "GIF 삽입",
        title: "GIF 삽입",
      },
      icon: <GifIcon />,
      execute: () => {
        // 모달 열기 전 현재 커서 위치 저장
        const container = editorContainerRef.current;
        if (container) {
          const textarea = container.querySelector("textarea");
          if (textarea) {
            cursorPositionRef.current = textarea.selectionStart;
          }
        }
        setGiphyOpen(true);
      },
    }),
    []
  );

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
              // p 태그 안에 figure가 중첩되지 않도록 처리
              // 이미지만 포함된 단락은 Fragment로 렌더링
              p: ({ children, ...props }) => {
                // children이 단일 img 요소인지 확인
                const childArray = Array.isArray(children) ? children : [children];
                const hasOnlyImage = childArray.length === 1 &&
                  typeof childArray[0] === 'object' &&
                  childArray[0] !== null &&
                  'type' in childArray[0] &&
                  (childArray[0].type === 'img' ||
                   (typeof childArray[0].type === 'function' && childArray[0].type.name === 'img'));

                // 이미지만 있는 경우 p 태그 없이 렌더링
                if (hasOnlyImage) {
                  return <>{children}</>;
                }
                return <p {...props}>{children}</p>;
              },
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
              code: ({ className, children, ...props }) => {
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
    <>
      <div
        ref={editorContainerRef}
        data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
      >
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || "")}
          preview="live"
          height={minHeight}
          textareaProps={{
            placeholder,
          }}
          extraCommands={[gifCommand]}
        />
      </div>
      <GiphyPickerDialog
        open={giphyOpen}
        onOpenChange={setGiphyOpen}
        onInsert={handleGifInsert}
      />
    </>
  );
}
