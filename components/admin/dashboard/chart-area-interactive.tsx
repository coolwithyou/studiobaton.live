"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ChartDataPoint {
  date: string
  posts: number
  commits: number
}

interface ChartAreaInteractiveProps {
  data: ChartDataPoint[]
}

const chartConfig = {
  posts: {
    label: "포스트",
    color: "var(--chart-1)",
  },
  commits: {
    label: "커밋",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = React.useState("30d")

  const filteredData = React.useMemo(() => {
    const referenceDate = new Date()
    let daysToSubtract = 30
    if (timeRange === "7d") {
      daysToSubtract = 7
    } else if (timeRange === "90d") {
      daysToSubtract = 90
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return data.filter((item) => {
      const date = new Date(item.date)
      return date >= startDate
    })
  }, [data, timeRange])

  return (
    <Card className="@container/chart">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>활동 트렌드</CardTitle>
          <CardDescription>
            포스트 작성 및 커밋 활동 현황
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="기간 선택"
          >
            <SelectValue placeholder="최근 30일" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">
              최근 7일
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              최근 30일
            </SelectItem>
            <SelectItem value="90d" className="rounded-lg">
              최근 90일
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillPosts" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-posts)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-posts)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillCommits" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-commits)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-commits)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="commits"
              type="natural"
              fill="url(#fillCommits)"
              stroke="var(--color-commits)"
              stackId="a"
            />
            <Area
              dataKey="posts"
              type="natural"
              fill="url(#fillPosts)"
              stroke="var(--color-posts)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
