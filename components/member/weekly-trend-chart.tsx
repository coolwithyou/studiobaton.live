"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TrendData {
  week: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface WeeklyTrendChartProps {
  data: TrendData[];
  /** 표시할 최근 주 수 */
  weeks?: number;
  /** 표시 연도 (기본: 현재 연도) */
  year?: number;
}

export function WeeklyTrendChart({ data, weeks = 12, year }: WeeklyTrendChartProps) {
  const currentYear = year ?? new Date().getFullYear();

  const chartData = useMemo(() => {
    // 현재 연도 데이터만 필터링
    const yearData = data.filter((d) => d.week.startsWith(`${currentYear}-`));
    const recentData = yearData.slice(-weeks);

    return recentData.map((d) => {
      // week가 "YYYY-WW" 형식이면 날짜로 변환
      const weekLabel = d.week.includes("-W")
        ? `${d.week.slice(5)}주`
        : format(parseISO(d.week), "M/d", { locale: ko });

      return {
        ...d,
        label: weekLabel,
      };
    });
  }, [data, weeks, currentYear]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return { type: "neutral" as const, percentage: 0 };

    const recent = chartData.slice(-4).reduce((sum, d) => sum + d.commits, 0);
    const previous = chartData.slice(-8, -4).reduce((sum, d) => sum + d.commits, 0);

    if (previous === 0) {
      return { type: recent > 0 ? "up" : "neutral", percentage: 0 };
    }

    const change = ((recent - previous) / previous) * 100;

    if (Math.abs(change) < 5) {
      return { type: "neutral" as const, percentage: Math.round(change) };
    }

    return {
      type: change > 0 ? "up" : "down",
      percentage: Math.round(Math.abs(change)),
    } as const;
  }, [chartData]);

  const totalCommits = chartData.reduce((sum, d) => sum + d.commits, 0);
  const avgCommits = chartData.length > 0 ? Math.round(totalCommits / chartData.length) : 0;

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>{currentYear}년 트렌드 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {trend.type === "up" && (
            <TrendingUp className="w-4 h-4 text-green-500" />
          )}
          {trend.type === "down" && (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          {trend.type === "neutral" && (
            <Minus className="w-4 h-4 text-muted-foreground" />
          )}
          <span
            className={cn(
              "font-medium",
              trend.type === "up" && "text-green-600 dark:text-green-400",
              trend.type === "down" && "text-red-600 dark:text-red-400",
              trend.type === "neutral" && "text-muted-foreground"
            )}
          >
            {trend.type === "up" && `+${trend.percentage}% 상승`}
            {trend.type === "down" && `-${trend.percentage}% 하락`}
            {trend.type === "neutral" && "변화 없음"}
          </span>
          <span className="text-muted-foreground">vs 이전 4주</span>
        </div>
        <span className="text-muted-foreground">
          주간 평균 {avgCommits}커밋
        </span>
      </div>

      {/* 차트 */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={30}
              className="fill-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-semibold mb-1">{data.week}</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">커밋:</span>{" "}
                        <span className="font-medium">{data.commits}</span>
                      </p>
                      <p>
                        <span className="text-green-600">+{data.additions.toLocaleString()}</span>
                        {" / "}
                        <span className="text-red-600">-{data.deletions.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="natural"
              dataKey="commits"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorCommits)"
              dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
