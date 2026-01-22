"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface RepositoryData {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface ProjectActivityChartProps {
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

export function ProjectActivityChart({ repositories }: ProjectActivityChartProps) {
  if (repositories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>프로젝트별 활동</CardTitle>
          <CardDescription>선택한 기간의 프로젝트별 커밋 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            데이터가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 커밋 수 기준 정렬 (내림차순)
  const sortedData = [...repositories].sort((a, b) => b.commits - a.commits);

  return (
    <Card>
      <CardHeader>
        <CardTitle>프로젝트별 활동</CardTitle>
        <CardDescription>선택한 기간의 프로젝트별 커밋 현황</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                          +{repo.additions.toLocaleString()} / -{repo.deletions.toLocaleString()}
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
                fontSize={12}
              />
              <LabelList
                dataKey="commits"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
