"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface DeveloperDailyActivity {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface DeveloperStats {
  author: string;
  avatar: string | null;
  dailyActivity: DeveloperDailyActivity[];
}

interface TeamCommitsAreaChartProps {
  developers: DeveloperStats[];
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
];

export function TeamCommitsAreaChart({ developers }: TeamCommitsAreaChartProps) {
  const { chartConfig, chartData, memberKeys } = React.useMemo(() => {
    // 활성 팀원 (최대 3명)
    const activeMembers = developers.slice(0, 3);

    // config 생성
    const config: ChartConfig = {};
    activeMembers.forEach((dev, idx) => {
      config[dev.author] = {
        label: dev.author,
        color: CHART_COLORS[idx],
      };
    });
    config.total = {
      label: "총합",
      color: "var(--chart-4)",
    };

    // 데이터 변환: 날짜별로 병합
    const dateMap = new Map<string, Record<string, number>>();

    // 모든 날짜 수집 및 팀원별 커밋 수 병합
    activeMembers.forEach((dev) => {
      dev.dailyActivity.forEach((activity) => {
        const existing = dateMap.get(activity.date) || {};
        existing[dev.author] = activity.commits;
        dateMap.set(activity.date, existing);
      });
    });

    // 날짜순 정렬 및 총합 계산
    const data = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, commits]) => {
        const total = Object.values(commits).reduce((sum, c) => sum + c, 0);
        // 요일 라벨 생성
        const dayOfWeek = new Date(date).toLocaleDateString("ko-KR", {
          weekday: "short",
        });
        return {
          date,
          label: dayOfWeek,
          ...commits,
          total,
        };
      });

    return {
      chartConfig: config,
      chartData: data,
      memberKeys: activeMembers.map((m) => m.author),
    };
  }, [developers]);

  if (developers.length === 0 || chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>팀원별 커밋 활동</CardTitle>
        <CardDescription>최근 7일간 팀원별 커밋 현황</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              {memberKeys.map((key, idx) => (
                <linearGradient
                  key={key}
                  id={`fill-${key.replace(/\s/g, "-")}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_COLORS[idx]}
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_COLORS[idx]}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
              <linearGradient id="fill-total" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-4)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-4)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} width={30} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]?.payload?.date) {
                      const date = new Date(payload[0].payload.date);
                      return date.toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      });
                    }
                    return "";
                  }}
                  indicator="dot"
                />
              }
            />
            {/* 총합 (배경, 점선) */}
            <Area
              dataKey="total"
              type="monotone"
              fill="url(#fill-total)"
              stroke="var(--color-total)"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            {/* 팀원별 */}
            {memberKeys.map((key, idx) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                fill={`url(#fill-${key.replace(/\s/g, "-")})`}
                stroke={CHART_COLORS[idx]}
                strokeWidth={2}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
