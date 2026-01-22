"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface DailyActivity {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface DeveloperDailyChartProps {
  dailyActivity: DailyActivity[];
}

const chartConfig = {
  commits: {
    label: "커밋",
    color: "#2b7fff",
  },
} satisfies ChartConfig;

export function DeveloperDailyChart({ dailyActivity }: DeveloperDailyChartProps) {
  if (dailyActivity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        활동 데이터가 없습니다.
      </p>
    );
  }

  // 날짜순 정렬 및 요일 라벨 추가
  const chartData = [...dailyActivity]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((activity) => ({
      ...activity,
      label: new Date(activity.date).toLocaleDateString("ko-KR", {
        weekday: "short",
      }),
    }));

  return (
    <ChartContainer config={chartConfig} className="h-[140px] w-full">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fillCommits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2b7fff" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#2b7fff" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={25}
          tick={{ fontSize: 10 }}
        />
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
              formatter={(value, name, item) => {
                const data = item.payload as DailyActivity;
                return (
                  <div className="flex flex-col gap-1">
                    <span>{value} 커밋</span>
                    <span className="text-xs text-muted-foreground">
                      +{data.additions.toLocaleString()} / -{data.deletions.toLocaleString()}
                    </span>
                  </div>
                );
              }}
              indicator="dot"
            />
          }
        />
        <Area
          dataKey="commits"
          type="monotone"
          fill="url(#fillCommits)"
          stroke="#2b7fff"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
