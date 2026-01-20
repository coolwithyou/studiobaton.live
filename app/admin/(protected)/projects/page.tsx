"use client"

import { RepositorySpreadsheet } from "./_components/repository-spreadsheet"
import { PageContainer } from "@/components/admin/ui/page-container"
import { PageHeader } from "@/components/admin/ui/page-header"

export default function ProjectsPage() {
  return (
    <PageContainer maxWidth="2xl">
      <PageHeader
        title="프로젝트 설정"
        description="리포지토리에 표시 이름을 설정하여 글 생성시 사용합니다."
      />

      <RepositorySpreadsheet />
    </PageContainer>
  )
}
