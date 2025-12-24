"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

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
    // 발행된 글은 읽기 전용으로 표시
    return (
      <div
        data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
        className="border rounded-md p-4 bg-muted/30 min-h-[400px] font-mono text-sm whitespace-pre-wrap opacity-60"
      >
        {value || placeholder}
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
