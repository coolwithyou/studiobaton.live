import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Code2, Palette, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "About | studiobaton",
  description:
    "스튜디오 바톤 개발팀을 소개합니다. 디자인과 개발의 균형을 추구하는 팀입니다.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-8">
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-tint transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>홈으로</span>
      </Link>

      <article className="space-y-12">
        {/* 히어로 섹션 */}
        <header className="space-y-3 border-b border-border/50 pb-10">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            ABOUT US
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="text-tint">BATON</span>
            <span className="text-foreground ml-1">DEV</span>
          </h1>
          <p className="text-muted-foreground max-w-lg leading-relaxed">
            스튜디오 바톤 개발팀을 소개합니다.
          </p>
        </header>

        {/* 소개 */}
        <section className="space-y-6">
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed">
            <p>
              스튜디오 바톤은 디자인 에이전시입니다. 그리고 저희 개발팀은 그 안에서
              디자인과 기술의 균형을 찾아가는 여정을 함께하고 있습니다.
            </p>
            <p>
              매일 쏟아지는 커밋과 코드 리뷰, 그 안에 담긴 작은 고민들과 성장의
              순간들을 이 블로그에 기록합니다. AI가 자동으로 커밋 내역을 분석하고
              글을 생성하지만, 그 안에 담긴 이야기는 저희 팀원들의 진짜 하루입니다.
            </p>
          </div>
        </section>

        {/* 특징 카드 */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="p-6 rounded-lg bg-card border border-border/50">
            <Code2 className="w-8 h-8 text-tint mb-4" />
            <h3 className="font-semibold mb-2">개발</h3>
            <p className="text-sm text-muted-foreground">
              웹과 앱, 그리고 그 사이의 모든 것을 만듭니다.
              기술은 도구일 뿐, 중요한 건 문제 해결입니다.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border/50">
            <Palette className="w-8 h-8 text-tint mb-4" />
            <h3 className="font-semibold mb-2">디자인</h3>
            <p className="text-sm text-muted-foreground">
              디자이너와 개발자가 함께 일합니다.
              좋은 제품은 좋은 협업에서 나온다고 믿습니다.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border/50">
            <Zap className="w-8 h-8 text-tint mb-4" />
            <h3 className="font-semibold mb-2">자동화</h3>
            <p className="text-sm text-muted-foreground">
              반복되는 일은 자동화합니다.
              이 블로그도 AI가 매일 자동으로 작성합니다.
            </p>
          </div>
        </section>

        {/* 링크 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">더 알아보기</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://ba-ton.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-tint/50 hover:text-tint transition-colors text-sm"
            >
              스튜디오 바톤 홈페이지
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/studiobaton"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-tint/50 hover:text-tint transition-colors text-sm"
            >
              GitHub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://dev.ba-ton.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-card border border-border/50 hover:border-tint/50 hover:text-tint transition-colors text-sm"
            >
              BATON DEV 블로그
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* 연락처 */}
        <section className="p-6 rounded-lg bg-card border border-border/50">
          <h2 className="font-semibold mb-2">함께 일하고 싶으신가요?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            프로젝트 문의나 협업 제안은 언제든 환영합니다.
          </p>
          <a
            href="mailto:hello@ba-ton.kr"
            className="inline-flex items-center gap-1.5 text-tint hover:underline text-sm font-medium"
          >
            hello@ba-ton.kr
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>
      </article>
    </div>
  );
}
