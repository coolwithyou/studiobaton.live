"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, GitPullRequest } from "lucide-react";
import { toast } from "sonner";

interface RecentIssue {
  displayId: string;
  title: string;
  url: string;
  syncedAt: string;
}

export function SidebarSyncCard() {
  const [syncing, setSyncing] = useState(false);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 최신 이슈 3개 조회
  const fetchRecentIssues = async () => {
    try {
      const response = await fetch("/api/console/issues/search?q=");
      const data = await response.json();

      if (data.issues && data.issues.length > 0) {
        setRecentIssues(data.issues.slice(0, 3));
        // 가장 최신 동기화 시간
        setLastSyncedAt(data.issues[0].syncedAt);
      }
    } catch (error) {
      console.error("Failed to fetch recent issues:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentIssues();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/console/issues/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "동기화 실패");
      }

      toast.success(`이슈 ${data.syncedCount}개 동기화 완료`);
      // 동기화 후 최신 이슈 다시 조회
      await fetchRecentIssues();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이슈 동기화에 실패했습니다."
      );
    } finally {
      setSyncing(false);
    }
  };

  const formatSyncTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">이슈 동기화</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "동기화 중..." : "GitHub 이슈 동기화"}
        </Button>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          10분마다 자동 동기화됩니다
        </p>

        {/* 최근 동기화된 이슈 */}
        {!loading && recentIssues.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                최근 동기화 이슈
              </span>
              {lastSyncedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatSyncTime(lastSyncedAt)}
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {recentIssues.map((issue) => (
                <li key={issue.displayId} className="flex items-start gap-1.5">
                  <GitPullRequest className="size-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground hover:text-primary line-clamp-1"
                    title={`${issue.displayId} ${issue.title}`}
                  >
                    <span className="text-primary font-medium">
                      {issue.displayId}
                    </span>{" "}
                    {issue.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && recentIssues.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            동기화된 이슈가 없습니다
          </p>
        )}
      </CardContent>
    </Card>
  );
}
