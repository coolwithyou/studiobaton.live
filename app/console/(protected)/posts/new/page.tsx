import { Metadata } from "next";
import { ManualPostForm } from "../_components/manual-post-form";
import prisma from "@/lib/prisma";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = {
  title: "새 포스트 작성 | Admin",
  description: "새 마크다운 포스트를 작성합니다.",
};

async function getContentTypes() {
  return prisma.contentType.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      displayName: true,
    },
    orderBy: { displayOrder: "asc" },
  });
}

export default async function NewPostPage() {
  const contentTypes = await getContentTypes();

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="새 포스트 작성"
        description="마크다운으로 새 포스트를 작성합니다. 커밋 기반 포스트와 달리 자유롭게 내용을 작성할 수 있습니다."
      />

      <ManualPostForm contentTypes={contentTypes} />
    </PageContainer>
  );
}
