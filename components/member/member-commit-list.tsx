import { ExternalLink } from "lucide-react";
import { formatKST, formatDistanceToNowKST } from "@/lib/date-utils";

interface Commit {
  id: string;
  sha: string;
  repository: string;
  message: string;
  committedAt: Date;
  additions: number;
  deletions: number;
  url: string;
}

interface MemberCommitListProps {
  commits: Commit[];
}

export function MemberCommitList({ commits }: MemberCommitListProps) {
  if (commits.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        최근 커밋 내역이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {commits.map((commit) => (
        <a
          key={commit.id}
          href={commit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate group-hover:text-primary transition-colors">
                {commit.message.split("\n")[0]}
              </p>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {commit.repository}
                </span>
                <span title={formatKST(commit.committedAt, "yyyy-MM-dd HH:mm")}>
                  {formatDistanceToNowKST(commit.committedAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-green-600 dark:text-green-400">
                  +{commit.additions}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-600 dark:text-red-400">
                  -{commit.deletions}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
