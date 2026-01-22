"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocHeading } from "@/lib/extract-headings";

interface MobileTocProps {
  headings: TocHeading[];
  className?: string;
}

export function MobileToc({ headings, className }: MobileTocProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${id}`);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("xl:hidden mb-6", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 px-4 bg-muted/50 rounded-lg text-sm font-medium min-h-[44px]"
        aria-expanded={isOpen}
        aria-controls="mobile-toc-content"
      >
        <span>목차 ({headings.length}개 섹션)</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <nav
          id="mobile-toc-content"
          className="mt-2 py-3 px-4 bg-muted/30 rounded-lg"
          aria-label="목차"
        >
          <ul className="space-y-2 text-sm">
            {headings.map((heading) => (
              <li
                key={heading.id}
                style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
              >
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleClick(e, heading.id)}
                  className="block py-1.5 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center"
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
