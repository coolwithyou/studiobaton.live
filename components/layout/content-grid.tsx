import { cn } from "@/lib/utils";

interface ContentGridProps {
  children: React.ReactNode;
  aside?: React.ReactNode;
  maxWidth?: "2xl" | "3xl" | "4xl" | "5xl" | "full";
  className?: string;
  /** 우측 aside에 "On this page" 헤더를 표시할지 여부 */
  showAsideHeader?: boolean;
}

const maxWidthClasses = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "",
};

/**
 * ContentGrid - 3열 그리드 레이아웃을 위한 컨텐츠 래퍼
 *
 * 구조: [사이드바(layout)] | [메인 컨텐츠(flex-1)] | [우측 위젯(선택)]
 *
 * 좌측 사이드바: 288px (layout에서 처리)
 * 우측 위젯: 224px
 * 메인 콘텐츠: 최대 768px (GitBook 스타일, 가독성 최적화)
 *
 * @param children - 메인 컨텐츠 영역
 * @param aside - 우측 위젯 영역 (TOC, 메타 정보 등) - xl 이상에서만 표시
 * @param maxWidth - 메인 컨텐츠의 최대 너비 (기본: 3xl = 768px)
 * @param showAsideHeader - 우측 aside에 "On this page" 헤더 표시 여부 (기본: true)
 */
export function ContentGrid({
  children,
  aside,
  maxWidth = "3xl",
  className,
  showAsideHeader = true,
}: ContentGridProps) {
  return (
    <div className={cn("py-8", className)}>
      <div className="flex gap-8">
        {/* 메인 컨텐츠 영역 */}
        <div className={cn("flex-1 min-w-0", maxWidthClasses[maxWidth])}>
          {children}
        </div>

        {/* 우측 위젯 영역 - xl 이상에서만 표시 (224px = w-56) */}
        {aside && (
          <aside className="hidden xl:flex xl:flex-col w-56 shrink-0 pl-6">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              {showAsideHeader && (
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  On this page
                </h4>
              )}
              {aside}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
