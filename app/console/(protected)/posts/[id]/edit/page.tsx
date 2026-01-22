import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ManualPostForm } from "../../_components/manual-post-form";
import prisma from "@/lib/prisma";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

export const metadata: Metadata = {
  title: "포스트 수정 | Admin",
  description: "마크다운 포스트를 수정합니다.",
};

async function getPost(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      summary: true,
      slug: true,
      contentTypeId: true,
      status: true,
      showInTimeline: true,
      thumbnailUrl: true,
    },
  });

  return post;
}

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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const [post, contentTypes] = await Promise.all([
    getPost(id),
    getContentTypes(),
  ]);

  if (!post) {
    notFound();
  }

  // 커밋 기반 포스트는 기존 편집 페이지로 리다이렉트
  if (post.type !== "MANUAL") {
    redirect(`/console/post/${id}`);
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="포스트 수정"
        description="마크다운 포스트를 수정합니다."
      />

      <ManualPostForm post={post} contentTypes={contentTypes} />
    </PageContainer>
  );
}
