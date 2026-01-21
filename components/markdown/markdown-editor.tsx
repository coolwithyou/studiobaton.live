"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { GiphyPickerDialog } from "@/components/giphy/giphy-picker-dialog";
import { toast } from "sonner";
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

// 이미지 아이콘 컴포넌트
function ImageIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
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

// 크기 값을 CSS max-width로 변환
function getSizeClass(size: string | null, isGif: boolean): string {
  if (size) {
    // 숫자만 있으면 %로 변환
    const sizeValue = size.endsWith("%") ? size : `${size}%`;
    return `max-w-[${sizeValue}]`;
  }
  // 기본값: GIF는 50%, 일반 이미지는 100%
  return isGif ? "max-w-[50%]" : "max-w-full";
}

// GIF 이미지 마크다운 생성 (data-gif 속성으로 구분)
function createGifMarkdown(gifUrl: string, altText: string): string {
  const caption = altText.trim() || "GIF";
  // 마크다운 이미지 문법 사용 - GIF 기본 50% 크기
  return `![${caption}|50%](${gifUrl})`;
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
  const [mounted, setMounted] = useState(false);
  const [giphyOpen, setGiphyOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const cursorPositionRef = useRef<number>(value.length);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 클라이언트 마운트 감지 (하이드레이션 불일치 방지)
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // 이미지 삽입 핸들러 - 커서 위치에 삽입
  // size: 퍼센트 값 (예: "100%", "75%", "50%") 또는 null (기본값 사용)
  const insertImageAtCursor = useCallback(
    (imageUrl: string, altText: string = "image", size: string | null = null) => {
      // 크기가 지정되면 alt|크기% 형식으로 삽입
      const altWithSize = size ? `${altText}|${size}` : altText;
      const imageMarkdown = `![${altWithSize}](${imageUrl})`;
      const pos = cursorPositionRef.current;

      const before = value.slice(0, pos);
      const after = value.slice(pos);

      const needNewlineBefore = before.length > 0 && !before.endsWith("\n");
      const needNewlineAfter = after.length > 0 && !after.startsWith("\n");

      const newValue =
        before +
        (needNewlineBefore ? "\n\n" : "") +
        imageMarkdown +
        (needNewlineAfter ? "\n\n" : "") +
        after;

      onChange(newValue);
    },
    [value, onChange]
  );

  // 이미지 업로드 핸들러
  const handleImageUpload = useCallback(
    async (file: File) => {
      // 파일 타입 검증
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("JPG, PNG, WebP, GIF 형식만 업로드 가능합니다.");
        return;
      }

      // 파일 크기 검증 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("파일 크기는 5MB 이하여야 합니다.");
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload/content-image", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "업로드 실패");
        }

        // 파일명에서 확장자 제거하여 alt 텍스트로 사용
        const altText = file.name.replace(/\.[^/.]+$/, "") || "image";
        insertImageAtCursor(result.url, altText);
        toast.success("이미지가 업로드되었습니다.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "업로드 중 오류 발생";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [insertImageAtCursor]
  );

  // 파일 선택 핸들러
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
      // input 초기화 (같은 파일 재선택 가능하게)
      e.target.value = "";
    },
    [handleImageUpload]
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

  // 이미지 업로드 커스텀 커맨드
  const imageCommand: ICommand = useMemo(
    () => ({
      name: "image-upload",
      keyCommand: "image-upload",
      buttonProps: {
        "aria-label": "이미지 업로드",
        title: isUploading ? "업로드 중..." : "이미지 업로드",
        disabled: isUploading,
      },
      icon: isUploading ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="animate-spin"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : (
        <ImageIcon />
      ),
      execute: () => {
        if (isUploading) return;
        // 파일 선택 전 현재 커서 위치 저장
        const container = editorContainerRef.current;
        if (container) {
          const textarea = container.querySelector("textarea");
          if (textarea) {
            cursorPositionRef.current = textarea.selectionStart;
          }
        }
        fileInputRef.current?.click();
      },
    }),
    [isUploading]
  );

  if (disabled) {
    // 발행된 글은 마크다운 렌더링으로 표시
    return (
      <div
        data-color-mode={mounted && resolvedTheme === "dark" ? "dark" : "light"}
        className="border rounded-md p-6 bg-muted/30 min-h-[400px]"
      >
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              // HTML figure 태그 지원 (data-size 속성으로 크기 조절)
              figure: ({ children, node, ...props }) => {
                // data-size 속성에서 크기 추출
                const dataSize = (node?.properties?.dataSize as string) || null;
                const sizeStyle = dataSize ? getSizeClass(dataSize, false) : "max-w-full";

                return (
                  <figure
                    className={`text-center my-6 ${sizeStyle} mx-auto`}
                    {...props}
                  >
                    {children}
                  </figure>
                );
              },
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
                if (!srcStr) return null;

                const isGif = srcStr.includes("giphy.com") || srcStr.endsWith(".gif");
                const { altText, size } = parseImageSize(alt);
                const sizeStyle = getSizeClass(size, isGif);

                // GIF 또는 크기가 지정된 이미지는 figure로 감싸서 중앙 정렬
                if (isGif || size) {
                  return (
                    <figure className="text-center my-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={altText || (isGif ? "GIF" : "image")}
                        className={`inline-block ${sizeStyle} h-auto`}
                      />
                      {altText && altText !== "GIF" && (
                        <figcaption className="text-sm opacity-70 mt-2">
                          {altText}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                // 일반 이미지 (크기 지정 없음)
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={altText || ""} className="max-w-full h-auto" />
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
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
      <div
        ref={editorContainerRef}
        data-color-mode={mounted && resolvedTheme === "dark" ? "dark" : "light"}
      >
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || "")}
          preview="live"
          height={minHeight}
          textareaProps={{
            placeholder,
          }}
          extraCommands={[imageCommand, gifCommand]}
          previewOptions={{
            rehypePlugins: [rehypeRaw],
            components: {
              // HTML figure 태그 지원 (data-size 속성으로 크기 조절)
              figure: ({ children, node, ...props }) => {
                const dataSize = (node?.properties?.dataSize as string) || null;
                const sizeStyle = dataSize ? getSizeClass(dataSize, false) : "max-w-full";

                return (
                  <figure
                    className={`text-center my-4 ${sizeStyle} mx-auto`}
                    {...props}
                  >
                    {children}
                  </figure>
                );
              },
              // 빈 src 이미지 경고 방지 및 크기 조절 지원
              img: ({ src, alt, ...props }) => {
                // src가 비어있거나 문자열이 아니면 렌더링하지 않음
                if (!src || typeof src !== "string") return null;

                const isGif = src.includes("giphy.com") || src.endsWith(".gif");
                const { altText, size } = parseImageSize(alt);
                const sizeStyle = getSizeClass(size, isGif);

                // GIF 또는 크기가 지정된 이미지는 figure로 감싸서 중앙 정렬
                if (isGif || size) {
                  return (
                    <figure className="text-center my-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={altText || (isGif ? "GIF" : "image")}
                        className={`inline-block ${sizeStyle} h-auto`}
                        {...props}
                      />
                      {altText && altText !== "GIF" && (
                        <figcaption className="text-sm opacity-70 mt-2">
                          {altText}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                // 일반 이미지 (크기 지정 없음)
                // eslint-disable-next-line @next/next/no-img-element
                return <img src={src} alt={altText || ""} className="max-w-full h-auto" {...props} />;
              },
            },
          }}
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
