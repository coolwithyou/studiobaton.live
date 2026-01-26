"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function SidebarSyncCard() {
  const [syncing, setSyncing] = useState(false);

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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이슈 동기화에 실패했습니다."
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">이슈 동기화</CardTitle>
      </CardHeader>
      <CardContent>
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
        <p className="mt-2 text-xs text-muted-foreground">
          # 검색에 최신 이슈를 반영합니다
        </p>
      </CardContent>
    </Card>
  );
}
