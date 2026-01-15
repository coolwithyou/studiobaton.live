import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserRole } from "@/app/generated/prisma";

// 역할별 접근 가능한 네비게이션 메뉴 정의
const NAV_ITEMS: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/admin", label: "대시보드", roles: ["ADMIN"] },
  { href: "/admin/generate", label: "수동 생성", roles: ["ADMIN"] },
  { href: "/admin/projects", label: "프로젝트 설정", roles: ["ADMIN"] },
  { href: "/admin/stats", label: "통계", roles: ["ADMIN"] },
  { href: "/admin/standup", label: "스탠드업", roles: ["ADMIN", "TEAM_MEMBER"] },
  { href: "/admin/wrap-up", label: "랩업", roles: ["ADMIN", "TEAM_MEMBER"] },
  { href: "/admin/members", label: "팀원 관리", roles: ["ADMIN"] },
  { href: "/admin/users", label: "사용자 관리", roles: ["ADMIN"] },
];

async function AdminHeader() {
  const session = await getServerSession();
  const userRole = (session?.user?.role as UserRole) || "ORG_MEMBER";

  // 현재 사용자 역할에 맞는 메뉴만 필터링
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

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
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
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
