import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Sidebar } from "@/components/layout/sidebar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex">
        {/* 사이드바 - lg 이상에서만 표시 */}
        <div className="hidden lg:block w-56 shrink-0 border-r">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto pl-4">
            <Suspense fallback={<div className="py-6 px-4 text-sm text-muted-foreground">로딩 중...</div>}>
              <Sidebar />
            </Suspense>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
