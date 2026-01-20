import { FileText, CheckCircle, Clock, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import prisma from "@/lib/prisma"

interface StatCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <span
              className={`text-xs font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export async function SectionCards() {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    totalPosts,
    publishedPosts,
    draftPosts,
    thisWeekPosts,
    lastWeekPosts,
    thisMonthPosts,
    lastMonthPosts,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.post.count({ where: { status: "DRAFT" } }),
    prisma.post.count({
      where: { createdAt: { gte: startOfWeek } },
    }),
    prisma.post.count({
      where: {
        createdAt: {
          gte: startOfLastWeek,
          lt: startOfWeek,
        },
      },
    }),
    prisma.post.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.post.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lt: startOfMonth,
        },
      },
    }),
  ])

  const weeklyTrend =
    lastWeekPosts > 0
      ? Math.round(((thisWeekPosts - lastWeekPosts) / lastWeekPosts) * 100)
      : thisWeekPosts > 0
      ? 100
      : 0

  const monthlyTrend =
    lastMonthPosts > 0
      ? Math.round(((thisMonthPosts - lastMonthPosts) / lastMonthPosts) * 100)
      : thisMonthPosts > 0
      ? 100
      : 0

  return (
    <div className="grid gap-4 @xs/main:grid-cols-2 @lg/main:grid-cols-4">
      <StatCard
        title="총 포스트"
        value={totalPosts}
        description="전체 포스트 수"
        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        trend={
          monthlyTrend !== 0
            ? { value: monthlyTrend, isPositive: monthlyTrend > 0 }
            : undefined
        }
      />
      <StatCard
        title="발행됨"
        value={publishedPosts}
        description="발행된 포스트"
        icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="대기중"
        value={draftPosts}
        description="검토 대기 중"
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="이번 주 작성"
        value={thisWeekPosts}
        description="주간 작성량"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        trend={
          weeklyTrend !== 0
            ? { value: weeklyTrend, isPositive: weeklyTrend > 0 }
            : undefined
        }
      />
    </div>
  )
}
