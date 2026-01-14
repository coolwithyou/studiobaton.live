"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronRight, FileCode, FilePlus, FileX, FileEdit } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

function FileStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "added":
      return <FilePlus className="size-4 text-green-600" />;
    case "removed":
      return <FileX className="size-4 text-red-600" />;
    case "renamed":
      return <FileEdit className="size-4 text-yellow-600" />;
    default:
      return <FileCode className="size-4 text-blue-600" />;
  }
}

function FileStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    added: { label: "추가됨", className: "bg-green-100 text-green-800" },
    removed: { label: "삭제됨", className: "bg-red-100 text-red-800" },
    modified: { label: "수정됨", className: "bg-blue-100 text-blue-800" },
    renamed: { label: "이름변경", className: "bg-yellow-100 text-yellow-800" },
  };

  const variant = variants[status] || { label: status, className: "bg-gray-100 text-gray-800" };

  return (
    <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", variant.className)}>
      {variant.label}
    </span>
  );
}

function DiffViewer({ patch }: { patch: string }) {
  const lines = patch.split("\n");

  return (
    <pre className="text-xs overflow-x-auto bg-muted/50 rounded-md p-3 font-mono leading-relaxed">
      {lines.map((line, index) => {
        let className = "text-muted-foreground";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          className = "text-green-700 bg-green-50";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          className = "text-red-700 bg-red-50";
        } else if (line.startsWith("@@")) {
          className = "text-purple-600 font-medium";
        }
        return (
          <div key={index} className={cn("px-1", className)}>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}

function FileItem({ file }: { file: CommitFile }) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className="border-l-2 border-muted pl-3 py-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileStatusIcon status={file.status} />
          <span className="text-sm font-mono truncate" title={file.filename}>
            {file.filename}
          </span>
          <FileStatusBadge status={file.status} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-green-600">+{file.additions}</span>
          <span className="text-xs text-red-600">-{file.deletions}</span>
          {file.patch && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowDiff(!showDiff)}
            >
              {showDiff ? "diff 닫기" : "diff 보기"}
            </Button>
          )}
        </div>
      </div>
      {showDiff && file.patch && (
        <div className="mt-2">
          <DiffViewer patch={file.patch} />
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
          <span className="text-green-600">+{commit.additions}</span>
        </Badge>
        <Badge variant="secondary" className="font-mono text-xs">
          <span className="text-red-600">-{commit.deletions}</span>
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
        <div className="mt-3 pt-3 border-t space-y-2">
          {commit.files.map((file) => (
            <FileItem key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
