"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

interface SessionData {
  isLoggedIn: boolean;
  email?: string;
  name?: string;
}

export function Header() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        setSession(data);
      } catch {
        setSession({ isLoggedIn: false });
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession({ isLoggedIn: false });
      router.refresh();
    } catch {
      // 무시
    }
  };

  const isInternalUser = session?.isLoggedIn && session?.email?.endsWith("@ba-ton.kr");

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          studiobaton
        </Link>
        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {isInternalUser ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {session?.name || session?.email?.split("@")[0]}
                  </span>
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
