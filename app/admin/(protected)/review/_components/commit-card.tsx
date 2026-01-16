"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus,
  FileX,
  FileEdit,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Monaco Editor는 클라이언트에서만 로드
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] bg-muted rounded-md flex items-center justify-center">
      <span className="text-muted-foreground text-sm">에디터 로딩 중...</span>
    </div>
  ),
});

interface CommitFile {
  id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

interface Commit {
  sha: string;
  message: string;
  committedAt: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  url: string;
  files: CommitFile[];
}

interface CommitCardProps {
  commit: Commit;
}

// 파일 확장자로 언어 감지
function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    dockerfile: "dockerfile",
    graphql: "graphql",
    prisma: "prisma",
  };
  return languageMap[ext] || "plaintext";
}

function FileStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "added":
      return <FilePlus className="size-4 text-green-500" />;
    case "removed":
      return <FileX className="size-4 text-red-500" />;
    case "renamed":
      return <FileEdit className="size-4 text-yellow-500" />;
    default:
      return <FileCode className="size-4 text-blue-500" />;
  }
}

function FileStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    added: {
      label: "추가됨",
      className: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
    },
    removed: {
      label: "삭제됨",
      className: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
    },
    modified: {
      label: "수정됨",
      className: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
    },
    renamed: {
      label: "이름변경",
      className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    },
  };

  const variant = variants[status] || {
    label: status,
    className: "bg-zinc-500/20 text-zinc-700 dark:text-zinc-400 border-zinc-500/30",
  };

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-xs font-medium border",
        variant.className
      )}
    >
      {variant.label}
    </span>
  );
}

function DiffViewer({ patch, filename }: { patch: string; filename: string }) {
  const { resolvedTheme } = useTheme();
  const lineCount = patch.split("\n").length;
  const editorHeight = Math.min(Math.max(lineCount * 19, 100), 500);
  const language = getLanguageFromFilename(filename);

  // diff 내용에서 실제 코드 부분 추출 (헤더 제외)
  const processedPatch = useMemo(() => {
    const lines = patch.split("\n");
    // @@ 라인 이후의 코드만 추출하고, +/- 접두사 유지
    return lines
      .map((line) => {
        // diff 헤더는 그대로 유지
        if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
          return line;
        }
        return line;
      })
      .join("\n");
  }, [patch]);

  return (
    <div className="rounded-md overflow-hidden border border-border">
      <Editor
        height={editorHeight}
        language={language}
        value={processedPatch}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          folding: false,
          wordWrap: "on",
          renderLineHighlight: "none",
          overviewRulerBorder: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          padding: { top: 8, bottom: 8 },
          contextmenu: false,
          selectionHighlight: false,
          occurrencesHighlight: "off",
          renderValidationDecorations: "off",
          guides: {
            indentation: false,
            bracketPairs: false,
          },
        }}
        onMount={(editor, monaco) => {
          // diff 라인별 배경색 decoration 추가
          const model = editor.getModel();
          if (!model) return;

          const decorations: {
            range: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number };
            options: { isWholeLine: boolean; className: string };
          }[] = [];

          const lines = patch.split("\n");
          lines.forEach((line, index) => {
            const lineNumber = index + 1;
            if (line.startsWith("+") && !line.startsWith("+++")) {
              decorations.push({
                range: {
                  startLineNumber: lineNumber,
                  endLineNumber: lineNumber,
                  startColumn: 1,
                  endColumn: 1,
                },
                options: {
                  isWholeLine: true,
                  className: "diff-line-added",
                },
              });
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              decorations.push({
                range: {
                  startLineNumber: lineNumber,
                  endLineNumber: lineNumber,
                  startColumn: 1,
                  endColumn: 1,
                },
                options: {
                  isWholeLine: true,
                  className: "diff-line-removed",
                },
              });
            } else if (line.startsWith("@@")) {
              decorations.push({
                range: {
                  startLineNumber: lineNumber,
                  endLineNumber: lineNumber,
                  startColumn: 1,
                  endColumn: 1,
                },
                options: {
                  isWholeLine: true,
                  className: "diff-line-info",
                },
              });
            }
          });

          editor.createDecorationsCollection(decorations);
        }}
      />
    </div>
  );
}

function FileItem({ file }: { file: CommitFile }) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className="border-l-2 border-muted-foreground/30 pl-3 py-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileStatusIcon status={file.status} />
          <span
            className="text-sm font-mono truncate text-foreground"
            title={file.filename}
          >
            {file.filename}
          </span>
          <FileStatusBadge status={file.status} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-green-600 dark:text-green-500 font-mono">
            +{file.additions}
          </span>
          <span className="text-xs text-red-600 dark:text-red-500 font-mono">
            -{file.deletions}
          </span>
          {file.patch && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs hover:bg-muted"
              onClick={() => setShowDiff(!showDiff)}
            >
              {showDiff ? "diff 닫기" : "diff 보기"}
            </Button>
          )}
        </div>
      </div>
      {showDiff && file.patch && (
        <div className="mt-2">
          <DiffViewer patch={file.patch} filename={file.filename} />
        </div>
      )}
    </div>
  );
}

export function CommitCard({ commit }: CommitCardProps) {
  const [showFiles, setShowFiles] = useState(false);
  const hasFiles = commit.files && commit.files.length > 0;

  return (
    <div className="border rounded-md p-4 space-y-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
            {commit.message}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(commit.committedAt), "HH:mm:ss", { locale: ko })}
          </p>
        </div>
        <a
          href={commit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="GitHub에서 보기"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          <span className="text-green-600 dark:text-green-400">
            +{commit.additions}
          </span>
        </Badge>
        <Badge variant="secondary" className="font-mono text-xs">
          <span className="text-red-600 dark:text-red-400">
            -{commit.deletions}
          </span>
        </Badge>
        {hasFiles ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => setShowFiles(!showFiles)}
          >
            {showFiles ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {commit.files.length}개 파일
          </Button>
        ) : (
          <Badge variant="outline" className="text-xs">
            {commit.filesChanged}개 파일
          </Badge>
        )}
      </div>

      {/* 파일 목록 */}
      {showFiles && hasFiles && (
        <div className="mt-3 pt-3 border-t space-y-2 bg-muted/50 -mx-4 px-4 pb-2 rounded-b-md">
          {commit.files.map((file) => (
            <FileItem key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
