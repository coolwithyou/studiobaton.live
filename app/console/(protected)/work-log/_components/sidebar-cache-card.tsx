"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SidebarCacheCardProps {
  memberId: string;
}

export function SidebarCacheCard({ memberId }: SidebarCacheCardProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleAggregateStats = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/cron/aggregate-worklog-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
        },
        body: JSON.stringify({ days: 30 }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({
          success: true,
          message: `${data.totalProcessed}건 처리 완료`,
        });
      } else {
        const error = await res.json();
        setResult({
          success: false,
          message: error.error || "처리 중 오류 발생",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "네트워크 오류",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="size-4" />
          통계 캐시
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-xs text-muted-foreground">
          최근 30일 통계를 수동으로 갱신합니다.
          <br />
          (자동: 하루 4회 실행)
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAggregateStats}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              집계 중...
            </>
          ) : (
            <>
              <Database className="size-4 mr-2" />
              캐시 갱신
            </>
          )}
        </Button>

        {result && (
          <div
            className={`flex items-center gap-2 text-xs ${
              result.success ? "text-green-600" : "text-red-600"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <AlertCircle className="size-3.5" />
            )}
            <span>{result.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
