"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  GitBranch,
  FolderGit2,
  Award,
  TrendingUp,
} from "lucide-react";
import { ContributionHeatmap } from "./contribution-heatmap";
import { StreakDisplay, StreakBadge } from "./streak-display";
import { BadgeDisplay, BadgeList } from "./badge-display";
import { ActivityStatsCard } from "./activity-stats-card";
import { HourlyChart } from "./hourly-chart";
import { WeeklyTrendChart } from "./weekly-trend-chart";
import { CommitTypeChart } from "./commit-type-chart";
import { RepoDistribution } from "./repo-distribution";

interface MemberStats {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  firstCommitAt: string | null;
  lastCommitAt: string | null;
  currentStreak: number;
  longestStreak: number;
  peakHour: number | null;
  activeDays: number;
  lastAggregatedAt: string | null;
}

interface HeatmapData {
  date: string;
  count: number;
}

interface TrendData {
  week: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface CommitTypeData {
  feat: number;
  fix: number;
  refactor: number;
  other: number;
}

interface RepoData {
  repository: string;
  commits: number;
}

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
}

interface MemberActivityData {
  member: {
    id: string;
    name: string;
    githubName: string;
    avatarUrl: string | null;
    profileImageUrl: string | null;
  };
  stats: MemberStats | null;
  heatmap: HeatmapData[];
  trend: TrendData[];
  commitTypes: CommitTypeData | null;
  repos: RepoData[];
  badges: BadgeInfo[];
}

interface MemberActivitySectionProps {
  githubName: string;
}

export function MemberActivitySection({ githubName }: MemberActivitySectionProps) {
  const [data, setData] = useState<MemberActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/member/${githubName}/stats`);
        if (!response.ok) {
          throw new Error("통계 데이터를 불러오는데 실패했습니다.");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [githubName]);

  if (loading) {
    return <MemberActivitySkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{error || "통계 데이터가 없습니다."}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data.stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>아직 통계가 집계되지 않았습니다.</p>
          <p className="text-sm mt-1">관리자에게 문의해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  const { stats, heatmap, trend, commitTypes, repos, badges } = data;

  // 시간대별 분포 데이터 (hourly chart용)
  // 실제로는 API에서 받아야 하지만, 현재 구조에서는 없으므로 빈 배열
  const hourlyDistribution = Array(24).fill(0);

  return (
    <div className="space-y-6">
      {/* 스트릭 + 배지 요약 */}
      <div className="flex flex-wrap items-center gap-4">
        <StreakBadge
          currentStreak={stats.currentStreak}
          longestStreak={stats.longestStreak}
        />
        {badges.length > 0 && (
          <BadgeDisplay badges={badges} maxDisplay={5} size="sm" />
        )}
      </div>

      {/* 기여 히트맵 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            기여 히트맵
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionHeatmap data={heatmap} />
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">활동 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityStatsCard stats={stats} />
        </CardContent>
      </Card>

      {/* 스트릭 상세 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            🔥 연속 기여
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StreakDisplay
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
          />
        </CardContent>
      </Card>

      {/* 차트 탭 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">상세 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trend" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trend" className="text-xs sm:text-sm">
                <TrendingUp className="w-4 h-4 mr-1.5 hidden sm:inline" />
                트렌드
              </TabsTrigger>
              <TabsTrigger value="types" className="text-xs sm:text-sm">
                <GitBranch className="w-4 h-4 mr-1.5 hidden sm:inline" />
                커밋 유형
              </TabsTrigger>
              <TabsTrigger value="repos" className="text-xs sm:text-sm">
                <FolderGit2 className="w-4 h-4 mr-1.5 hidden sm:inline" />
                프로젝트
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trend" className="mt-4">
              <WeeklyTrendChart data={trend} />
            </TabsContent>

            <TabsContent value="types" className="mt-4">
              <CommitTypeChart data={commitTypes} />
            </TabsContent>

            <TabsContent value="repos" className="mt-4">
              <RepoDistribution data={repos} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 배지 목록 */}
      {badges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5" />
              획득 배지 ({badges.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeList badges={badges} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MemberActivitySkeleton() {
  return (
    <div className="space-y-6">
      {/* 스트릭 + 배지 */}
      <div className="flex gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>

      {/* 히트맵 */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>

      {/* 통계 */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 차트 */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
