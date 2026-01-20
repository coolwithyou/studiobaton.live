import { cn } from "@/lib/utils";

interface ContentGridProps {
  children: React.ReactNode;
  aside?: React.ReactNode;
  maxWidth?: "2xl" | "3xl" | "4xl" | "5xl" | "full";
  className?: string;
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
 * 구조: [사이드바(layout)] | [메인 컨텐츠] | [우측 위젯(선택)]
 *
 * @param children - 메인 컨텐츠 영역
 * @param aside - 우측 위젯 영역 (TOC, 메타 정보 등) - xl 이상에서만 표시
 * @param maxWidth - 메인 컨텐츠의 최대 너비 (기본: 2xl)
 */
export function ContentGrid({
  children,
  aside,
  maxWidth = "2xl",
  className,
}: ContentGridProps) {
  return (
    <div className={cn("py-8", className)}>
      <div className="flex gap-8">
        {/* 메인 컨텐츠 영역 */}
        <div className={cn("flex-1 min-w-0", maxWidthClasses[maxWidth])}>
          {children}
        </div>

        {/* 우측 위젯 영역 - xl 이상에서만 표시 */}
        {aside && (
          <aside className="hidden xl:block w-56 shrink-0">
            <div className="sticky top-20">{aside}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
