"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  title: string;
  href: string;
  isExternal: boolean;
  activePattern?: string | null;
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface SidebarClientProps {
  sections: MenuSection[];
  className?: string;
  onLinkClick?: () => void;
}

export function SidebarClient({
  sections,
  className,
  onLinkClick,
}: SidebarClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 현재 URL과 메뉴 아이템 비교
  const isActive = (item: MenuItem): boolean => {
    const { href, activePattern } = item;

    // 외부 링크는 활성 상태 체크 안함
    if (href.startsWith("http")) return false;

    // activePattern이 있으면 정규식 매칭 우선
    if (activePattern) {
      try {
        const regex = new RegExp(activePattern);
        return regex.test(pathname);
      } catch {
        // 정규식 오류 시 기본 로직으로 폴백
        console.warn(`Invalid activePattern: ${activePattern}`);
      }
    }

    // 쿼리 파라미터가 있는 경우 (예: /posts?category=xxx)
    if (href.includes("?")) {
      const [hrefPath, hrefQuery] = href.split("?");
      const hrefParams = new URLSearchParams(hrefQuery);

      // 경로가 다르면 비활성
      if (pathname !== hrefPath) return false;

      // 모든 쿼리 파라미터가 일치하는지 확인
      for (const [key, value] of hrefParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }

    // 단순 경로 비교
    return pathname === href;
  };

  return (
    <aside className={cn("py-6 pr-4", className)}>
      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item);

                if (item.isExternal) {
                  return (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onLinkClick}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-colors",
                          "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {item.title}
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "block px-2 py-1.5 text-sm rounded-md transition-colors",
                        active
                          ? "bg-key/10 text-key font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
