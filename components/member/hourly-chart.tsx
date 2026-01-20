"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Clock } from "lucide-react";

interface HourlyChartProps {
  /** 시간대별 커밋 수 배열 (0-23시, 길이 24) */
  distribution: number[];
}

function getHourLabel(hour: number): string {
  if (hour === 0) return "12AM";
  if (hour === 12) return "12PM";
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

function getTimeCategory(hour: number): "dawn" | "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const categoryColors = {
  dawn: "#fbbf24",     // amber-400
  morning: "#60a5fa",  // blue-400
  afternoon: "#34d399", // emerald-400
  evening: "#f97316",   // orange-500
  night: "#a78bfa",     // violet-400
};

export function HourlyChart({ distribution }: HourlyChartProps) {
  const data = useMemo(() => {
    // 24시간 데이터가 아닌 경우 패딩
    const hours = Array.isArray(distribution) && distribution.length === 24
      ? distribution
      : Array(24).fill(0);

    return hours.map((count, hour) => ({
      hour,
      label: getHourLabel(hour),
      count,
      category: getTimeCategory(hour),
    }));
  }, [distribution]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCommits = data.reduce((sum, d) => sum + d.count, 0);
  const peakHour = data.reduce((max, d) => (d.count > max.count ? d : max), data[0]);

  // 활동 시간대 분포 계산
  const timeDistribution = useMemo(() => {
    const categories = {
      dawn: { label: "새벽 (5-9시)", emoji: "🌅", count: 0 },
      morning: { label: "오전 (9-12시)", emoji: "☀️", count: 0 },
      afternoon: { label: "오후 (12-17시)", emoji: "🌤️", count: 0 },
      evening: { label: "저녁 (17-21시)", emoji: "🌆", count: 0 },
      night: { label: "밤 (21-5시)", emoji: "🌙", count: 0 },
    };

    data.forEach((d) => {
      categories[d.category].count += d.count;
    });

    return Object.entries(categories)
      .map(([key, value]) => ({
        key,
        ...value,
        percentage: totalCommits > 0 ? (value.count / totalCommits) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, totalCommits]);

  if (totalCommits === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>시간대별 활동 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 피크 시간 요약 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">{timeDistribution[0]?.emoji}</span>
          <span className="text-muted-foreground">
            가장 활발한 시간대:{" "}
            <span className="font-medium text-foreground">
              {getHourLabel(peakHour.hour)}
            </span>
          </span>
        </div>
        <span className="text-muted-foreground">
          총 {totalCommits.toLocaleString()} 커밋
        </span>
      </div>

      {/* 바 차트 */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={2}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={30}
              className="fill-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-md">
                    <p className="font-semibold">{data.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.count} 커밋
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={categoryColors[entry.category]}
                  opacity={entry.count === peakHour.count ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 시간대 분포 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {timeDistribution.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-1.5 p-2 rounded bg-muted/50"
          >
            <span>{item.emoji}</span>
            <div>
              <div className="font-medium">{item.percentage.toFixed(0)}%</div>
              <div className="text-muted-foreground">{item.count}커밋</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
