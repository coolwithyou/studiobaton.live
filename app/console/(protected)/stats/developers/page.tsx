import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/admin/ui/page-container"
import { PageHeader } from "@/components/admin/ui/page-header"
import { DeveloperStatsDashboard } from "@/components/admin/developer-stats-dashboard"

export const dynamic = "force-dynamic"

export default function DeveloperStatsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="개발자 활동 통계"
        description="개발자별 커밋 활동과 작업 패턴을 확인하세요"
      >
        <Button variant="outline" asChild>
          <Link href="/console/stats">
            <ChevronLeft className="mr-2 h-4 w-4" />
            통계로 돌아가기
          </Link>
        </Button>
      </PageHeader>

      <DeveloperStatsDashboard />
    </PageContainer>
  )
}
