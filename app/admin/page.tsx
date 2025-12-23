import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

async function PostList() {
  const posts = await prisma.post.findMany({
    orderBy: {
      targetDate: "desc",
    },
    take: 50,
    include: {
      versions: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          commits: true,
        },
      },
    },
  });

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>아직 포스트가 없습니다.</p>
        <p className="text-sm mt-2">
          Vercel Cron이 매일 자정에 커밋을 수집합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/admin/post/${post.id}`}
          className="block py-4 hover:bg-muted/50 transition-colors px-4 -mx-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <time className="text-sm text-muted-foreground">
                  {format(post.targetDate, "yyyy년 M월 d일 (EEE)", {
                    locale: ko,
                  })}
                </time>
                <Badge
                  variant={post.status === "PUBLISHED" ? "default" : "secondary"}
                >
                  {post.status === "PUBLISHED"
                    ? "발행됨"
                    : post.status === "DRAFT"
                    ? "대기중"
                    : "보관됨"}
                </Badge>
              </div>
              <h3 className="font-medium truncate">
                {post.title || post.versions[0]?.title || "제목 없음"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {post._count.commits}개의 커밋 · {post.versions.length}개 버전
              </p>
            </div>
            <Button variant="ghost" size="sm">
              {post.status === "PUBLISHED" ? "보기" : "편집"}
            </Button>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PostListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="py-4">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-5 w-64 mb-1" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">포스트 관리</h1>
          <p className="text-muted-foreground mt-1">
            AI가 생성한 글을 검토하고 발행하세요
          </p>
        </div>
      </div>

      <Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </Suspense>
    </div>
  );
}
