import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { TimelineItem } from "@/components/timeline/timeline-item";
import { TimelineSkeleton } from "@/components/timeline/timeline-skeleton";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

async function Timeline() {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: {
      targetDate: "desc",
    },
    take: 20,
    include: {
      commits: {
        select: {
          id: true,
          repository: true,
          author: true,
          authorAvatar: true,
          additions: true,
          deletions: true,
        },
      },
    },
  });

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">아직 발행된 글이 없습니다.</p>
        <p className="text-sm text-muted-foreground mt-2">
          곧 새로운 이야기로 찾아뵙겠습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="py-8">
      {posts.map((post, index) => (
        <TimelineItem
          key={post.id}
          post={{
            id: post.id,
            slug: post.slug!,
            title: post.title!,
            content: post.content!,
            summary: post.summary,
            targetDate: post.targetDate.toISOString(),
            publishedAt: post.publishedAt?.toISOString() || null,
            commits: post.commits,
          }}
          isLatest={index === 0}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 max-w-2xl">
      <Suspense fallback={<TimelineSkeleton />}>
        <Timeline />
      </Suspense>
    </div>
  );
}
