"use client";

import { useActiveHeading } from "@/hooks/use-active-heading";
import { cn } from "@/lib/utils";
import type { TocHeading } from "@/lib/extract-headings";

interface TableOfContentsProps {
  headings: TocHeading[];
  className?: string;
}

export function TableOfContents({ headings, className }: TableOfContentsProps) {
  const headingIds = headings.map((h) => h.id);
  const activeId = useActiveHeading(headingIds);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // URL 해시 업데이트 (히스토리에 추가하지 않음)
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <nav className={cn("space-y-1", className)} aria-label="목차">
      <ul className="space-y-1 text-sm">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
          >
            <a
              href={`#${heading.id}`}
              onClick={(e) => handleClick(e, heading.id)}
              className={cn(
                "block py-1.5 transition-colors duration-200 hover:text-foreground",
                activeId === heading.id
                  ? "text-foreground font-medium border-l-2 border-primary pl-2 -ml-[2px]"
                  : "text-muted-foreground"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
