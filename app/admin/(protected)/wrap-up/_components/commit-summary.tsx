"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertTriangle, Zap, Bug, Wrench, TestTube, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommitHighlight {
  rank: number;
  commitHash: string;
  category: "feat" | "fix" | "perf" | "refactor" | "test" | "chore";
  title: string;
  description: string;
  impact: string;
  repositoryName?: string;
}

interface SummaryData {
  summary: {
    totalCommits: number;
    highlightCount: number;
    primaryFocus: string;
  };
  highlights: CommitHighlight[];
  techDebtNotes: string[];
}

interface CommitSummaryProps {
  date: Date;
  memberId: string;
  hasCommits: boolean;
  commitHashToRepo?: Map<string, string>;
}

const categoryIcons: Record<string, React.ReactNode> = {
  feat: <Zap className="size-4" />,
  fix: <Bug className="size-4" />,
  perf: <Sparkles className="size-4" />,
  refactor: <Wrench className="size-4" />,
  test: <TestTube className="size-4" />,
  chore: <Settings className="size-4" />,
};

const categoryColors: Record<string, string> = {
  feat: "bg-blue-500/10 text-blue-600 border-blue-200",
  fix: "bg-red-500/10 text-red-600 border-red-200",
  perf: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  refactor: "bg-purple-500/10 text-purple-600 border-purple-200",
  test: "bg-green-500/10 text-green-600 border-green-200",
  chore: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const categoryLabels: Record<string, string> = {
  feat: "기능",
  fix: "버그 수정",
  perf: "성능",
  refactor: "리팩토링",
  test: "테스트",
  chore: "기타",
};

export function CommitSummary({ date, memberId, hasCommits, commitHashToRepo }: CommitSummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 기존 데이터 로드
  const fetchExistingData = useCallback(async () => {
    if (!hasCommits) {
      setInitialLoading(false);
      return;
    }

    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await fetch(
        `/api/admin/wrap-up/summarize?date=${dateStr}&memberId=${memberId}`
      );
      const data = await response.json();

      if (response.ok && data.exists) {
        setSummaryData({
          summary: data.summary,
          highlights: data.highlights,
          techDebtNotes: data.techDebtNotes,
        });
      }
    } catch (err) {
      console.error("Failed to fetch existing summary:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [date, memberId, hasCommits]);

  useEffect(() => {
    setInitialLoading(true);
    setSummaryData(null);
    setError(null);
    fetchExistingData();
  }, [fetchExistingData]);

  const handleAnalyze = async (regenerate: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/wrap-up/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          memberId,
          regenerate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI 분석에 실패했습니다.");
      }

      setSummaryData(data);
    } catch (err) {
      console.error("Failed to analyze commits:", err);
      setError(err instanceof Error ? err.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasCommits) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-yellow-500" />
            AI 커밋 하이라이트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            오늘 커밋이 없어 분석할 수 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (initialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-yellow-500" />
            AI 커밋 하이라이트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summaryData && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-yellow-500" />
            AI 커밋 하이라이트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              AI가 오늘의 커밋을 분석하여 주요 변경사항을 요약합니다.
            </p>
            <Button onClick={() => handleAnalyze(false)} disabled={loading}>
              <Sparkles className="size-4 mr-2" />
              하이라이트 분석하기
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive text-center mt-4">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-yellow-500" />
            AI 커밋 하이라이트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">커밋을 분석 중입니다...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-yellow-500" />
            AI 커밋 하이라이트
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => handleAnalyze(true)}>
            <RefreshCw className="size-3 mr-1" />
            재생성
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 요약 */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">{summaryData?.summary.primaryFocus}</p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>총 {summaryData?.summary.totalCommits}개 커밋</span>
            <span>|</span>
            <span>{summaryData?.summary.highlightCount}개 하이라이트</span>
          </div>
        </div>

        {/* 하이라이트 목록 */}
        {summaryData?.highlights && summaryData.highlights.length > 0 && (
          <div className="space-y-3">
            {summaryData.highlights.map((highlight) => {
              const repoName = commitHashToRepo?.get(highlight.commitHash);
              return (
                <div
                  key={highlight.commitHash}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn("gap-1", categoryColors[highlight.category])}
                    >
                      {categoryIcons[highlight.category]}
                      {categoryLabels[highlight.category]}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      #{highlight.rank}
                    </span>
                    {repoName && (
                      <span className="text-xs text-muted-foreground">
                        {repoName}
                      </span>
                    )}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {highlight.commitHash}
                    </code>
                  </div>
                  <h4 className="font-medium text-sm">{highlight.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {highlight.description}
                  </p>
                  <p className="text-xs text-primary">{highlight.impact}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* 기술 부채 노트 */}
        {summaryData?.techDebtNotes && summaryData.techDebtNotes.length > 0 && (
          <div className="p-3 border border-orange-200 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="size-4 text-orange-500" />
              <span className="text-sm font-medium">기술 부채 노트</span>
            </div>
            <ul className="space-y-1">
              {summaryData.techDebtNotes.map((note, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  • {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
