import { Suspense } from "react";
import type { Metadata } from "next";
import { ContentGrid } from "@/components/layout/content-grid";
import {
  fetchBlogCommits,
  groupCommitsByDate,
  formatDateKorean,
  getCommitTypeIcon,
  type ChangelogCommit,
} from "@/lib/changelog";
import { SITE_URL, SITE_NAME } from "@/lib/config";

// ISR: 1시간마다 재생성
export const revalidate = 3600;

export const metadata: Metadata = {
  title: `업데이트 | ${SITE_NAME}`,
  description: "블로그의 최신 업데이트 내역을 확인하세요.",
  alternates: {
    canonical: `${SITE_URL}/updates`,
  },
};

function UpdatesSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="border-l-2 border-border pl-4 space-y-2">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-5 bg-muted/30 rounded animate-pulse"
                style={{ width: `${60 + Math.random() * 30}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommitItem({ commit }: { commit: ChangelogCommit }) {
  const icon = getCommitTypeIcon(commit.type);

  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="shrink-0 text-base" aria-hidden="true">
        {icon}
      </span>
      <span className="text-foreground/90 leading-relaxed">{commit.title}</span>
    </li>
  );
}

function DateGroup({
  dateStr,
  commits,
}: {
  dateStr: string;
  commits: ChangelogCommit[];
}) {
  const formattedDate = formatDateKorean(dateStr);

  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-muted-foreground mb-3">
        {formattedDate}
      </h2>
      <ul className="border-l-2 border-border pl-4 space-y-0.5">
        {commits.map((commit) => (
          <CommitItem key={commit.sha} commit={commit} />
        ))}
      </ul>
    </section>
  );
}

async function UpdatesContent() {
  const commits = await fetchBlogCommits(100);

  if (commits.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">업데이트 내역이 없습니다.</p>
      </div>
    );
  }

  const groupedCommits = groupCommitsByDate(commits);

  // 날짜 내림차순 정렬 (최신 날짜 먼저)
  const sortedDates = Array.from(groupedCommits.keys()).sort(
    (a, b) => b.localeCompare(a)
  );

  return (
    <div>
      {sortedDates.map((dateStr) => (
        <DateGroup
          key={dateStr}
          dateStr={dateStr}
          commits={groupedCommits.get(dateStr)!}
        />
      ))}
    </div>
  );
}

export default function UpdatesPage() {
  return (
    <ContentGrid>
      <div className="pb-8">
        <h1 className="text-2xl font-bold mb-2">업데이트</h1>
        <p className="text-muted-foreground text-sm">
          블로그의 최신 변경 사항을 확인하세요.
        </p>
      </div>

      <Suspense fallback={<UpdatesSkeleton />}>
        <UpdatesContent />
      </Suspense>
    </ContentGrid>
  );
}
