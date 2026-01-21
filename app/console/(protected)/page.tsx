import { Suspense } from "react"
import prisma from "@/lib/prisma"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { PageContainer } from "@/components/admin/ui/page-container"
import { PageHeader } from "@/components/admin/ui/page-header"
import { SectionCards } from "@/components/admin/dashboard/section-cards"
import { ChartAreaInteractive } from "@/components/admin/dashboard/chart-area-interactive"
import {
  RecentPostsTable,
  type PostData,
} from "@/components/admin/dashboard/recent-posts-table"

export const dynamic = "force-dynamic"

function CardsSkeleton() {
  return (
    <div className="grid gap-4 @xs/main:grid-cols-2 @lg/main:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

async function ChartData() {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [posts, commitLogs] = await Promise.all([
    prisma.post.groupBy({
      by: ["targetDate"],
      _count: { id: true },
      where: {
        targetDate: { gte: ninetyDaysAgo },
      },
      orderBy: { targetDate: "asc" },
    }),
    prisma.commitLog.groupBy({
      by: ["committedAt"],
      _count: { id: true },
      where: {
        committedAt: { gte: ninetyDaysAgo },
      },
      orderBy: { committedAt: "asc" },
    }),
  ])

  const dateMap = new Map<string, { posts: number; commits: number }>()

  for (const p of posts) {
    const dateStr = p.targetDate.toISOString().split("T")[0]
    const existing = dateMap.get(dateStr) || { posts: 0, commits: 0 }
    dateMap.set(dateStr, { ...existing, posts: p._count.id })
  }

  for (const c of commitLogs) {
    const dateStr = c.committedAt.toISOString().split("T")[0]
    const existing = dateMap.get(dateStr) || { posts: 0, commits: 0 }
    dateMap.set(dateStr, { ...existing, commits: c._count.id })
  }

  const chartData = Array.from(dateMap.entries())
    .map(([date, counts]) => ({
      date,
      posts: counts.posts,
      commits: counts.commits,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return <ChartAreaInteractive data={chartData} />
}

async function RecentPosts() {
  const posts = await prisma.post.findMany({
    orderBy: { targetDate: "desc" },
    take: 20,
    include: {
      versions: {
        select: { title: true },
        take: 1,
      },
      _count: {
        select: { commits: true },
      },
    },
  })

  const tableData: PostData[] = posts.map((post) => ({
    id: post.id,
    title: post.title || post.versions[0]?.title || "제목 없음",
    status: post.status as "PUBLISHED" | "DRAFT" | "ARCHIVED",
    targetDate: post.targetDate.toISOString(),
    commitCount: post._count.commits,
    versionCount: post.versions.length,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 포스트</CardTitle>
        <CardDescription>최근 작성된 포스트 목록입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <RecentPostsTable data={tableData} />
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  return (
    <PageContainer>
      <PageHeader
        title="대시보드"
        description="콘텐츠 현황을 한눈에 확인하세요"
      />

      <Suspense fallback={<CardsSkeleton />}>
        <SectionCards />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <ChartData />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentPosts />
      </Suspense>
    </PageContainer>
  )
}
