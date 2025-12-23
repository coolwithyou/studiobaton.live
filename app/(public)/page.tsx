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
    <div className="space-y-4">
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

function HeroSection() {
  return (
    <section className="py-10 md:py-14 border-b border-border/50 mb-8">
      <div className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          <span className="text-tint">STUDIO</span>
          <span className="text-foreground">BATON</span>
          <span className="text-muted-foreground ml-2 text-2xl md:text-3xl font-normal">
            DEV
          </span>
        </h1>
        <p className="text-muted-foreground max-w-lg leading-relaxed">
          스튜디오 바톤 개발팀의 일상을 기록합니다. AI가 매일 자동으로 커밋
          내역을 분석하고 글을 작성합니다.
        </p>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <HeroSection />
      <section className="pb-12">
        <Suspense fallback={<TimelineSkeleton />}>
          <Timeline />
        </Suspense>
      </section>
    </div>
  );
}
