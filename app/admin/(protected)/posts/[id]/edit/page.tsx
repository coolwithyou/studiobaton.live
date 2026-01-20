import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ManualPostForm } from "../../_components/manual-post-form";
import prisma from "@/lib/prisma";

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
      category: true,
      status: true,
      showInTimeline: true,
    },
  });

  return post;
}

async function getCategories() {
  const posts = await prisma.post.findMany({
    where: {
      category: { not: null },
    },
    select: {
      category: true,
    },
    distinct: ["category"],
  });

  return posts
    .map((p) => p.category)
    .filter((c): c is string => c !== null);
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    getPost(id),
    getCategories(),
  ]);

  if (!post) {
    notFound();
  }

  // 커밋 기반 포스트는 기존 편집 페이지로 리다이렉트
  if (post.type !== "MANUAL") {
    redirect(`/admin/post/${id}`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">포스트 수정</h1>
        <p className="text-muted-foreground mt-1">
          마크다운 포스트를 수정합니다.
        </p>
      </div>

      <ManualPostForm post={post} categories={categories} />
    </div>
  );
}
