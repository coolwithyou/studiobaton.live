"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { ScrambleText } from "@/components/ui/scramble-text";

interface NextAuthSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: "ADMIN" | "TEAM_MEMBER" | "ORG_MEMBER";
    status?: "PENDING" | "ACTIVE" | "INACTIVE";
  };
  expires?: string;
}

export function Header() {
  const [session, setSession] = useState<NextAuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        setSession(data);
      } catch {
        setSession(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    // NextAuth의 signOut 페이지로 리다이렉트
    window.location.href = "/api/auth/signout";
  };

  // 로그인 여부 (세션에 사용자 정보가 있으면 로그인 상태)
  const isLoggedIn = !!session?.user?.email;
  // 어드민 접근 가능 여부 (ADMIN, TEAM_MEMBER만)
  const canAccessAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "TEAM_MEMBER";

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          studiobaton log
          <span className="text-sm text-muted-foreground pl-2">
            //-- <ScrambleText loop={true} loopInterval={3000} texts={["스튜디오 바톤 개발팀의 일상 개발 로그"]} />
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {session?.user?.name || session?.user?.email?.split("@")[0]}
                  </span>
                  {canAccessAdmin && (
                    <Link href="/admin">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground gap-1.5"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden sm:inline">대시보드</span>
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground"
                  >
                    로그아웃
                  </Button>
                </div>
              ) : (
                <Link href="/admin/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    로그인
                  </Button>
                </Link>
              )}
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
