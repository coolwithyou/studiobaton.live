"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitBranch,
  FolderGit2,
  Award,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { ContributionHeatmap } from "./contribution-heatmap";
import { StreakBadge } from "./streak-display";
import { BadgeDisplay, BadgeList } from "./badge-display";
import { TrophyShowcase, TrophySummary } from "./trophy-showcase";
import { ActivityStatsCard } from "./activity-stats-card";
import { WeeklyTrendChart } from "./weekly-trend-chart";
import { CommitTypeChart } from "./commit-type-chart";
import { RepoDistribution } from "./repo-distribution";
import type { Trophy as TrophyType } from "@/lib/trophies";

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
  icon: string;
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
  trophies: TrophyType[];
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

  const { stats, heatmap, trend, commitTypes, repos, badges, trophies } = data;

  // 현재 연도
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* 기여 히트맵 - 카드 없이 바로 표시 */}
      <ContributionHeatmap data={heatmap} year={currentYear} />

      {/* 스트릭 + 활동 통계 (컴팩트) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <StreakBadge
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
          />
          {badges.length > 0 && (
            <BadgeDisplay badges={badges} maxDisplay={5} size="sm" />
          )}
        </div>
        <ActivityStatsCard stats={stats} compact />
      </div>

      {/* 트로피 쇼케이스 */}
      {trophies && trophies.filter(t => t.rank !== "UNKNOWN").length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="w-4 h-4" />
              트로피
            </h3>
            <TrophySummary trophies={trophies} />
          </div>
          <TrophyShowcase trophies={trophies} size="md" columns={4} showEmpty={false} />
        </div>
      )}

      {/* 차트 탭 */}
      <Card>
        <CardContent className="pt-4">
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
              <WeeklyTrendChart data={trend} year={currentYear} />
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
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
            <Award className="w-4 h-4" />
            획득 배지 ({badges.length}개)
          </h3>
          <BadgeList badges={badges} />
        </div>
      )}
    </div>
  );
}

function MemberActivitySkeleton() {
  return (
    <div className="space-y-6">
      {/* 히트맵 */}
      <Skeleton className="h-36 w-full" />

      {/* 스트릭 + 통계 */}
      <div className="space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-6 w-full max-w-xl" />
      </div>

      {/* 차트 */}
      <Card>
        <CardContent className="pt-4">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
