"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/about", label: "About" },
];

// BATON 로고 아이콘 (이미지 참고)
function BatonIcon() {
  return (
    <div className="w-7 h-7 bg-tint rounded flex items-center justify-center">
      <span className="text-tint-foreground font-bold text-sm">B</span>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          <BatonIcon />
          <span className="text-tint">BATON</span>
          <span className="text-foreground">DEV</span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors hover:text-tint ${
                pathname === item.href
                  ? "text-tint font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 우측 액션 영역 */}
        <div className="flex items-center gap-1">
          {/* 검색 버튼 (비활성화) */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground h-8 px-3 bg-muted/50 rounded-lg"
            disabled
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Ask or search...</span>
            <kbd className="ml-4 text-xs bg-background px-1.5 py-0.5 rounded border">
              ⌘K
            </kbd>
          </Button>

          <ThemeToggle />

          {/* 모바일 햄버거 메뉴 */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="text-left font-bold flex items-center gap-2">
                  <BatonIcon />
                  <span className="text-tint">BATON</span>
                  <span>DEV</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`text-lg transition-colors hover:text-tint py-2 ${
                      pathname === item.href
                        ? "text-tint font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
