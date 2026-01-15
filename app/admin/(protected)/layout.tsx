import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

async function AdminHeader() {
  const session = await getServerSession();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
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
              href="/admin/review"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              커밋 리뷰
            </Link>
            <Link
              href="/admin/members"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              팀원 관리
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
            {session?.user?.email}
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              로그아웃
            </Button>
          </form>
          <ThemeToggle />
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
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main>{children}</main>
    </div>
  );
}
