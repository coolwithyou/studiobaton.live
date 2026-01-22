"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronDown, ChevronUp, User, GitCommit, FileCode, Calendar } from "lucide-react";
import { DeveloperDailyChart } from "./developer-daily-chart";
import { DeveloperReposChart } from "./developer-repos-chart";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface DeveloperStats {
  author: string;
  email: string | null;
  displayEmail: string | null;
  isNoreplyEmail: boolean;
  avatar: string | null;
  summary: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    totalFilesChanged: number;
    avgCommitSize: number;
    activeDays: number;
  };
  dailyActivity: Array<{
    date: string;
    commits: number;
    additions: number;
    deletions: number;
  }>;
  repositories: Array<{
    name: string;
    commits: number;
    percentage: number;
  }>;
  hourlyDistribution: number[];
}

interface ApiResponse {
  developers: DeveloperStats[];
  teamSummary: {
    totalDevelopers: number;
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    avgCommitsPerDev: number;
  };
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

// 시간대별 히트맵 색상
function getHeatmapColor(value: number, max: number): string {
  if (value === 0) return "hsl(var(--muted))";
  const intensity = Math.min(value / max, 1);
  return `hsl(var(--foreground) / ${0.2 + intensity * 0.8})`;
}

// 개발자 카드 컴포넌트
function DeveloperCard({
  developer,
  isExpanded,
  onToggle,
}: {
  developer: DeveloperStats;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { summary, dailyActivity, repositories, hourlyDistribution } = developer;
  const maxHourly = Math.max(...hourlyDistribution, 1);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {developer.avatar ? (
            <Image
              src={developer.avatar}
              alt={developer.author}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="text-left">
            <p className="font-medium">{developer.author}</p>
            {developer.displayEmail && (
              <p className="text-xs text-muted-foreground">
                {developer.displayEmail}
                {developer.isNoreplyEmail && (
                  <span className="ml-1 text-[10px] opacity-60">(private)</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-lg font-medium">{summary.totalCommits}</p>
            <p className="text-xs text-muted-foreground">커밋</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-green-600">+{summary.totalAdditions.toLocaleString()}</p>
            <p className="text-sm font-medium text-red-600">-{summary.totalDeletions.toLocaleString()}</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">{summary.activeDays}일</p>
            <p className="text-xs text-muted-foreground">활동</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/20 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-background rounded-md">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <GitCommit className="w-4 h-4" />
                <span>총 커밋</span>
              </div>
              <p className="text-xl font-medium">{summary.totalCommits}</p>
            </div>
            <div className="p-3 bg-background rounded-md">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileCode className="w-4 h-4" />
                <span>파일 변경</span>
              </div>
              <p className="text-xl font-medium">{summary.totalFilesChanged}</p>
            </div>
            <div className="p-3 bg-background rounded-md">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span>활동 일수</span>
              </div>
              <p className="text-xl font-medium">{summary.activeDays}일</p>
            </div>
            <div className="p-3 bg-background rounded-md">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="text-xs">평균</span>
              </div>
              <p className="text-xl font-medium">{summary.avgCommitSize}</p>
              <p className="text-xs text-muted-foreground">줄/커밋</p>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="bg-background rounded-md p-3">
            <h4 className="text-sm font-medium mb-3">일별 커밋 활동</h4>
            <DeveloperDailyChart dailyActivity={dailyActivity} />
          </div>

          {/* Hourly Heatmap */}
          <div className="bg-background rounded-md p-3">
            <h4 className="text-sm font-medium mb-3">시간대별 활동 패턴</h4>
            <div className="flex gap-0.5">
              {hourlyDistribution.map((count, hour) => (
                <div key={hour} className="flex-1 text-center">
                  <div
                    className="h-6 rounded-sm mb-1"
                    style={{ backgroundColor: getHeatmapColor(count, maxHourly) }}
                    title={`${hour}시: ${count}개`}
                  />
                  {hour % 4 === 0 && (
                    <span className="text-[10px] text-muted-foreground">{hour}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              피크 시간: {hourlyDistribution.indexOf(maxHourly)}시
            </p>
          </div>

          {/* Repository Distribution */}
          {repositories.length > 0 && (
            <div className="bg-background rounded-md p-3">
              <h4 className="text-sm font-medium mb-3">프로젝트별 분포</h4>
              <DeveloperReposChart repositories={repositories} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 팀 요약 카드
function TeamSummaryCard({
  teamSummary,
  period,
}: {
  teamSummary: ApiResponse["teamSummary"];
  period: ApiResponse["period"];
}) {
  return (
    <div className="border rounded-lg p-4 mb-6 bg-muted/30">
      <h3 className="text-sm font-medium mb-3">
        팀 전체 ({period.startDate} ~ {period.endDate})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{teamSummary.totalDevelopers}</p>
          <p className="text-xs text-muted-foreground">개발자</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{teamSummary.totalCommits}</p>
          <p className="text-xs text-muted-foreground">총 커밋</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">+{teamSummary.totalAdditions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">추가된 줄</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">-{teamSummary.totalDeletions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">삭제된 줄</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{teamSummary.avgCommitsPerDev}</p>
          <p className="text-xs text-muted-foreground">인당 평균</p>
        </div>
      </div>
    </div>
  );
}

export function DeveloperStatsDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [expandedDev, setExpandedDev] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/console/stats/developers?days=${days}`);
      if (!response.ok) {
        throw new Error("통계 데이터를 불러오는데 실패했습니다.");
      }
      const result = await response.json();
      setData(result);
      // 첫 번째 개발자 자동 펼치기
      if (result.developers.length > 0 && !expandedDev) {
        setExpandedDev(result.developers[0].author);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-4 text-sm">
        <label className="text-muted-foreground">기간</label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-1.5 border rounded-md bg-background"
        >
          <option value={7}>최근 7일</option>
          <option value={14}>최근 14일</option>
          <option value={30}>최근 30일</option>
          <option value={60}>최근 60일</option>
          <option value={90}>최근 90일</option>
        </select>
      </div>

      {/* Team Summary */}
      <TeamSummaryCard teamSummary={data.teamSummary} period={data.period} />

      {/* Developer List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          개발자별 활동 ({data.developers.length}명)
        </h3>
        {data.developers.length > 0 ? (
          data.developers.map((developer) => (
            <DeveloperCard
              key={developer.author}
              developer={developer}
              isExpanded={expandedDev === developer.author}
              onToggle={() =>
                setExpandedDev(
                  expandedDev === developer.author ? null : developer.author
                )
              }
            />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            해당 기간에 커밋 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* Notice */}
      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
        <p className="font-medium mb-1">참고사항</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>커밋 수는 활동량을 나타내며, 생산성의 직접적인 지표가 아닙니다.</li>
          <li>복잡한 작업은 커밋 수가 적을 수 있습니다.</li>
          <li>팀 전체 트렌드를 파악하는 용도로 활용하세요.</li>
        </ul>
      </div>
    </div>
  );
}
