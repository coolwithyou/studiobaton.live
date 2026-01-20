"use client";

import { useMemo } from "react";
import { FolderGit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RepoData {
  repository: string;
  commits: number;
}

interface RepoDistributionProps {
  data: RepoData[];
  /** 표시할 최대 레포지토리 수 */
  maxItems?: number;
}

// 레포지토리 색상 팔레트
const repoColors = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#f97316", // orange-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f59e0b", // amber-500
  "#6366f1", // indigo-500
];

export function RepoDistribution({ data, maxItems = 8 }: RepoDistributionProps) {
  const processedData = useMemo(() => {
    if (data.length === 0) return { items: [], others: 0, total: 0 };

    const sorted = [...data].sort((a, b) => b.commits - a.commits);
    const total = sorted.reduce((sum, d) => sum + d.commits, 0);

    if (sorted.length <= maxItems) {
      return {
        items: sorted.map((item, idx) => ({
          ...item,
          color: repoColors[idx % repoColors.length],
          percentage: (item.commits / total) * 100,
        })),
        others: 0,
        total,
      };
    }

    const topItems = sorted.slice(0, maxItems - 1);
    const othersCount = sorted.slice(maxItems - 1).reduce((sum, d) => sum + d.commits, 0);

    return {
      items: topItems.map((item, idx) => ({
        ...item,
        color: repoColors[idx % repoColors.length],
        percentage: (item.commits / total) * 100,
      })),
      others: othersCount,
      othersPercentage: (othersCount / total) * 100,
      total,
    };
  }, [data, maxItems]);

  if (processedData.total === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FolderGit2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>프로젝트 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 상단 요약 */}
      <div className="text-sm text-muted-foreground">
        <FolderGit2 className="w-4 h-4 inline-block mr-1" />
        <span>
          {data.length}개 프로젝트에{" "}
          <span className="font-medium text-foreground">
            {processedData.total.toLocaleString()}
          </span>
          개 커밋
        </span>
      </div>

      {/* 스택 바 */}
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {processedData.items.map((item, idx) => (
          <div
            key={item.repository}
            className="h-full transition-all hover:opacity-80"
            style={{
              width: `${item.percentage}%`,
              backgroundColor: item.color,
            }}
            title={`${item.repository}: ${item.commits}개 (${item.percentage.toFixed(1)}%)`}
          />
        ))}
        {processedData.others > 0 && (
          <div
            className="h-full bg-muted-foreground/30"
            style={{ width: `${processedData.othersPercentage}%` }}
            title={`기타: ${processedData.others}개 (${processedData.othersPercentage?.toFixed(1)}%)`}
          />
        )}
      </div>

      {/* 범례 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {processedData.items.map((item) => (
          <div
            key={item.repository}
            className="flex items-center gap-2 min-w-0"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate flex-1" title={item.repository}>
              {item.repository}
            </span>
            <span className="text-muted-foreground shrink-0">
              {item.commits}
            </span>
          </div>
        ))}
        {processedData.others > 0 && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full shrink-0 bg-muted-foreground/30" />
            <span className="truncate flex-1 text-muted-foreground">
              기타 ({data.length - maxItems + 1}개)
            </span>
            <span className="text-muted-foreground shrink-0">
              {processedData.others}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface RepoDistributionCompactProps {
  data: RepoData[];
  maxItems?: number;
}

/** 컴팩트 버전 */
export function RepoDistributionCompact({ data, maxItems = 3 }: RepoDistributionCompactProps) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => b.commits - a.commits);
  const top = sorted.slice(0, maxItems);
  const total = sorted.reduce((sum, d) => sum + d.commits, 0);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <FolderGit2 className="w-4 h-4" />
      {top.map((item, idx) => (
        <span key={item.repository}>
          {item.repository} ({Math.round((item.commits / total) * 100)}%)
          {idx < top.length - 1 && ", "}
        </span>
      ))}
      {sorted.length > maxItems && (
        <span>외 {sorted.length - maxItems}개</span>
      )}
    </div>
  );
}
