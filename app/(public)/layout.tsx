import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SidebarClient } from "@/components/layout/sidebar-client";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getSideMenuSections } from "@/components/layout/sidebar";

// 공개 페이지 다크 모드 강제 적용을 위한 CSS 변수
const darkModeStyles = {
  // 텍스트 색상 직접 설정 (상속을 위해)
  color: "oklch(0.985 0 0)",
  // CSS 변수들
  "--key-color": "#ffd970",
  "--key-color-hover": "#ffe59c",
  "--background": "oklch(0.178 0 0)",
  "--foreground": "oklch(0.985 0 0)",
  "--card": "oklch(0.22 0 0)",
  "--card-foreground": "oklch(0.985 0 0)",
  "--popover": "oklch(0.22 0 0)",
  "--popover-foreground": "oklch(0.985 0 0)",
  "--primary": "oklch(0.922 0 0)",
  "--primary-foreground": "oklch(0.205 0 0)",
  "--secondary": "oklch(0.269 0 0)",
  "--secondary-foreground": "oklch(0.985 0 0)",
  "--muted": "oklch(0.269 0 0)",
  "--muted-foreground": "oklch(0.708 0 0)",
  "--accent": "oklch(0.269 0 0)",
  "--accent-foreground": "oklch(0.985 0 0)",
  "--destructive": "oklch(0.704 0.191 22.216)",
  "--border": "oklch(1 0 0 / 10%)",
  "--input": "oklch(1 0 0 / 15%)",
  "--ring": "oklch(0.556 0 0)",
  "--sidebar": "oklch(0.178 0 0)",
  "--sidebar-foreground": "oklch(0.7 0 0)",
  "--sidebar-border": "oklch(1 0 0 / 10%)",
} as React.CSSProperties;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 서버에서 메뉴 데이터를 한 번만 페칭
  const menuSections = await getSideMenuSections();

  return (
    <div className="min-h-screen bg-background flex flex-col dark" style={darkModeStyles}>
      <Header />

      {/* 모바일 네비게이션 (lg 미만) */}
      <MobileNav sections={menuSections} />

      <div className="flex-1">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex flex-col lg:flex-row">
            {/* 좌측 사이드바 - lg 이상에서만 표시 (288px = w-72) */}
            <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:mr-8">
              <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto w-full pr-4">
                <Suspense
                  fallback={
                    <div className="py-6 text-sm text-muted-foreground">
                      로딩 중...
                    </div>
                  }
                >
                  <SidebarClient sections={menuSections} />
                </Suspense>
              </div>
            </aside>

            {/* 메인 콘텐츠 영역 - 각 페이지에서 ContentGrid로 우측 위젯 배치 */}
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
