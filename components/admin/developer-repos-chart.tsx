"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface RepositoryData {
  name: string;
  commits: number;
  percentage: number;
}

interface DeveloperReposChartProps {
  repositories: RepositoryData[];
}

const chartConfig = {
  commits: {
    label: "커밋",
    color: "#2b7fff",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function DeveloperReposChart({ repositories }: DeveloperReposChartProps) {
  if (repositories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        데이터가 없습니다.
      </p>
    );
  }

  // 상위 5개만 표시
  const sortedData = [...repositories]
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);

  // 차트 높이 계산 (항목당 40px)
  const chartHeight = Math.max(sortedData.length * 40, 120);

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
      <BarChart
        accessibilityLayer
        data={sortedData}
        layout="vertical"
        margin={{ right: 48 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          hide
        />
        <XAxis dataKey="commits" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value, name, item) => {
                const repo = item.payload as RepositoryData;
                return (
                  <div className="flex flex-col gap-1">
                    <span>{value} 커밋</span>
                    <span className="text-xs text-muted-foreground">
                      전체의 {repo.percentage}%
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Bar
          dataKey="commits"
          layout="vertical"
          fill="#2b7fff"
          radius={4}
        >
          <LabelList
            dataKey="name"
            position="insideLeft"
            offset={8}
            className="fill-white"
            fontSize={11}
          />
          <LabelList
            dataKey="commits"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
