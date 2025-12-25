import { redirect } from "next/navigation";
import { getSessionData } from "@/lib/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function AdminHeader() {
  const session = await getSessionData();

  async function logout() {
    "use server";
    const { getSession } = await import("@/lib/session");
    const sess = await getSession();
    sess.destroy();
    redirect("/admin/login");
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold text-lg">
            studiobaton
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              대시보드
            </Link>
            <Link
              href="/admin/generate"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              수동 생성
            </Link>
            <Link
              href="/admin/projects"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              프로젝트 설정
            </Link>
            <Link
              href="/admin/stats"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              통계
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
              target="_blank"
            >
              사이트 보기 ↗
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.email}
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              로그아웃
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionData();

  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main>{children}</main>
    </div>
  );
}
