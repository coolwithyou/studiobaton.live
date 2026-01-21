import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SidebarClient } from "@/components/layout/sidebar-client";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getSideMenuSections } from "@/components/layout/sidebar";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 서버에서 메뉴 데이터를 한 번만 페칭
  const menuSections = await getSideMenuSections();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* 모바일 네비게이션 (lg 미만) */}
      <MobileNav sections={menuSections} />

      <div className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-screen-2xl">
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
