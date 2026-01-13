"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Commit {
  sha: string;
  message: string;
  committedAt: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  url: string;
}

interface CommitCardProps {
  commit: Commit;
}

export function CommitCard({ commit }: CommitCardProps) {
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
        <Badge variant="outline" className="text-xs">
          {commit.filesChanged}개 파일
        </Badge>
      </div>
    </div>
  );
}
