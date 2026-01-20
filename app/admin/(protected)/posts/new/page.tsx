import { Metadata } from "next";
import { ManualPostForm } from "../_components/manual-post-form";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "새 포스트 작성 | Admin",
  description: "새 마크다운 포스트를 작성합니다.",
};

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

export default async function NewPostPage() {
  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">새 포스트 작성</h1>
        <p className="text-muted-foreground mt-1">
          마크다운으로 새 포스트를 작성합니다. 커밋 기반 포스트와 달리 자유롭게 내용을 작성할 수 있습니다.
        </p>
      </div>

      <ManualPostForm categories={categories} />
    </div>
  );
}
