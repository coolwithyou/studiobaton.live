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

  // 하위 뎁스 그룹 계산 (연속된 level > 1 항목들을 그룹화)
  const renderHeadings = () => {
    const result: React.ReactNode[] = [];
    let i = 0;

    while (i < headings.length) {
      const heading = headings[i];

      // level 1 항목 (최상위)
      if (heading.level === 1) {
        result.push(
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(e) => handleClick(e, heading.id)}
              className={cn(
                "block py-1.5 transition-colors duration-200 hover:text-[#ffd970]",
                activeId === heading.id
                  ? "text-[#ffd970]"
                  : "text-muted-foreground opacity-70"
              )}
            >
              {heading.text}
            </a>
          </li>
        );
        i++;
      } else {
        // 하위 뎁스 항목들을 그룹으로 묶기
        const subItems: TocHeading[] = [];
        while (i < headings.length && headings[i].level > 1) {
          subItems.push(headings[i]);
          i++;
        }

        if (subItems.length > 0) {
          result.push(
            <li key={`group-${subItems[0].id}`} className="pl-3">
              <ul className="border-l border-muted-foreground/30 pl-3 space-y-1">
                {subItems.map((subHeading) => (
                  <li
                    key={subHeading.id}
                    style={{ paddingLeft: `${(subHeading.level - 2) * 12}px` }}
                  >
                    <a
                      href={`#${subHeading.id}`}
                      onClick={(e) => handleClick(e, subHeading.id)}
                      className={cn(
                        "block py-1 transition-colors duration-200 hover:text-[#ffd970]",
                        activeId === subHeading.id
                          ? "text-[#ffd970]"
                          : "text-muted-foreground opacity-60"
                      )}
                    >
                      {subHeading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          );
        }
      }
    }

    return result;
  };

  return (
    <nav className={cn("space-y-1", className)} aria-label="목차">
      <ul className="space-y-1 text-sm">{renderHeadings()}</ul>
    </nav>
  );
}
