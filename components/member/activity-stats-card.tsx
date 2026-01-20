"use client";

import { GitCommit, Plus, Minus, Calendar, Clock, Activity } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ActivityStatsCardProps {
  stats: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    activeDays: number;
    firstCommitAt: string | null;
    lastCommitAt: string | null;
    peakHour: number | null;
  };
  /** 컴팩트 레이아웃 */
  compact?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function formatPeakHour(hour: number | null): string {
  if (hour === null) return "-";
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${displayHour}시`;
}

function getPeakHourEmoji(hour: number | null): string {
  if (hour === null) return "⏰";
  if (hour >= 5 && hour < 9) return "🌅";
  if (hour >= 9 && hour < 17) return "☀️";
  if (hour >= 17 && hour < 21) return "🌆";
  return "🌙";
}

export function ActivityStatsCard({ stats, compact = false }: ActivityStatsCardProps) {
  const totalLines = stats.totalAdditions + stats.totalDeletions;
  const netLines = stats.totalAdditions - stats.totalDeletions;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <GitCommit className="w-4 h-4" />
          <span className="font-medium text-foreground">{formatNumber(stats.totalCommits)}</span>
          <span>커밋</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">{formatNumber(stats.totalAdditions)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Minus className="w-4 h-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400">{formatNumber(stats.totalDeletions)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{stats.activeDays}일 활동</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {/* 총 커밋 */}
      <StatItem
        icon={<GitCommit className="w-5 h-5 text-blue-500" />}
        label="총 커밋"
        value={formatNumber(stats.totalCommits)}
        subLabel="commits"
      />

      {/* 코드 변경량 */}
      <StatItem
        icon={<Activity className="w-5 h-5 text-purple-500" />}
        label="코드 변경"
        value={
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400">
              +{formatNumber(stats.totalAdditions)}
            </span>
            <span className="text-red-600 dark:text-red-400">
              -{formatNumber(stats.totalDeletions)}
            </span>
          </div>
        }
        subLabel={`순 ${netLines >= 0 ? "+" : ""}${formatNumber(netLines)} 줄`}
      />

      {/* 활동일 */}
      <StatItem
        icon={<Calendar className="w-5 h-5 text-amber-500" />}
        label="활동일"
        value={stats.activeDays.toLocaleString()}
        subLabel="일"
      />

      {/* 첫 커밋 */}
      <StatItem
        icon={<span className="text-lg">🎉</span>}
        label="첫 커밋"
        value={
          stats.firstCommitAt
            ? format(new Date(stats.firstCommitAt), "yyyy.MM.dd")
            : "-"
        }
        subLabel={
          stats.firstCommitAt
            ? format(new Date(stats.firstCommitAt), "eee", { locale: ko })
            : undefined
        }
      />

      {/* 최근 커밋 */}
      <StatItem
        icon={<Clock className="w-5 h-5 text-teal-500" />}
        label="최근 커밋"
        value={
          stats.lastCommitAt
            ? format(new Date(stats.lastCommitAt), "yyyy.MM.dd")
            : "-"
        }
        subLabel={
          stats.lastCommitAt
            ? format(new Date(stats.lastCommitAt), "eee", { locale: ko })
            : undefined
        }
      />

      {/* 피크 시간 */}
      <StatItem
        icon={<span className="text-lg">{getPeakHourEmoji(stats.peakHour)}</span>}
        label="주 활동 시간"
        value={formatPeakHour(stats.peakHour)}
        subLabel={stats.peakHour !== null ? "가장 활발한 시간" : undefined}
      />
    </div>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subLabel?: string;
}

function StatItem({ icon, label, value, subLabel }: StatItemProps) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      {subLabel && (
        <div className="text-xs text-muted-foreground mt-1">{subLabel}</div>
      )}
    </div>
  );
}
