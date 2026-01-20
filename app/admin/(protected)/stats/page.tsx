import Link from "next/link"
import { Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/admin/ui/page-container"
import { PageHeader } from "@/components/admin/ui/page-header"
import { StatsDashboard } from "@/components/admin/stats-dashboard"

export const dynamic = "force-dynamic"

export default function StatsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="활동 통계"
        description="커밋 활동과 글 발행 현황을 확인하세요"
      >
        <Button variant="outline" asChild>
          <Link href="/admin/stats/developers">
            <Users className="mr-2 h-4 w-4" />
            개발자별 통계
          </Link>
        </Button>
      </PageHeader>

      <StatsDashboard />
    </PageContainer>
  )
}
