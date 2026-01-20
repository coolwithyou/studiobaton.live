import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-helpers";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileSidebar } from "@/components/admin/admin-mobile-sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 모바일 헤더 (lg 미만에서 표시) */}
      <AdminMobileSidebar />

      <div className="flex">
        {/* 데스크탑 사이드바 (lg 이상에서 표시) */}
        <div className="hidden lg:block">
          <AdminSidebar />
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-h-screen">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
