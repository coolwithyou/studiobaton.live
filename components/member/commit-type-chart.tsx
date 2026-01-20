"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommitTypeData {
  feat: number;
  fix: number;
  refactor: number;
  other: number;
}

interface CommitTypeChartProps {
  data: CommitTypeData | null;
}

const typeConfig = {
  feat: {
    label: "기능 추가",
    shortLabel: "feat",
    color: "#22c55e", // green-500
    emoji: "✨",
  },
  fix: {
    label: "버그 수정",
    shortLabel: "fix",
    color: "#ef4444", // red-500
    emoji: "🐛",
  },
  refactor: {
    label: "리팩토링",
    shortLabel: "refactor",
    color: "#3b82f6", // blue-500
    emoji: "♻️",
  },
  other: {
    label: "기타",
    shortLabel: "other",
    color: "#a1a1aa", // zinc-400
    emoji: "📝",
  },
};

export function CommitTypeChart({ data }: CommitTypeChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    return Object.entries(data)
      .map(([key, value]) => ({
        name: key as keyof typeof typeConfig,
        value,
        ...typeConfig[key as keyof typeof typeConfig],
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>커밋 유형 데이터가 없습니다</p>
      </div>
    );
  }

  // 가장 많은 커밋 유형
  const topType = chartData[0];

  return (
    <div className="space-y-4">
      {/* 상단 요약 */}
      <div className="text-sm text-muted-foreground">
        <span className="mr-1">{topType.emoji}</span>
        <span>
          가장 많은 커밋 유형:{" "}
          <span className="font-medium text-foreground">{topType.label}</span>
          {" "}({Math.round((topType.value / total) * 100)}%)
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* 파이 차트 */}
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
                      <p className="font-semibold">
                        {data.emoji} {data.label}
                      </p>
                      <p className="text-muted-foreground">
                        {data.value}개 ({Math.round((data.value / total) * 100)}%)
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 범례 */}
        <div className="flex-1 space-y-2">
          {chartData.map((item) => {
            const percentage = (item.value / total) * 100;
            return (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <span className="mr-1">{item.emoji}</span>
                      {item.label}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {item.value}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CommitTypeInlineProps {
  data: CommitTypeData | null;
}

/** 인라인 커밋 유형 표시 */
export function CommitTypeInline({ data }: CommitTypeInlineProps) {
  if (!data) return null;

  const total = data.feat + data.fix + data.refactor + data.other;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 text-xs">
      {data.feat > 0 && (
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: typeConfig.feat.color }}
          />
          feat {Math.round((data.feat / total) * 100)}%
        </span>
      )}
      {data.fix > 0 && (
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: typeConfig.fix.color }}
          />
          fix {Math.round((data.fix / total) * 100)}%
        </span>
      )}
      {data.refactor > 0 && (
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: typeConfig.refactor.color }}
          />
          refactor {Math.round((data.refactor / total) * 100)}%
        </span>
      )}
    </div>
  );
}
