"use client";

import { useRef } from "react";
import {
  OverlayScrollbarsComponent,
  OverlayScrollbarsComponentRef,
} from "overlayscrollbars-react";
import { cn } from "@/lib/utils";

interface ScrollableContainerProps {
  children: React.ReactNode;
  className?: string;
  /** 스크롤 방향 설정 */
  overflow?: {
    x?: "hidden" | "scroll" | "visible" | "visible-hidden";
    y?: "hidden" | "scroll" | "visible" | "visible-hidden";
  };
  /** auto-hide 모드 */
  autoHide?: "never" | "scroll" | "leave" | "move";
  /** auto-hide 딜레이 (ms) */
  autoHideDelay?: number;
  /** 최대 높이 설정 */
  maxHeight?: string;
}

export function ScrollableContainer({
  children,
  className,
  overflow = { x: "hidden", y: "scroll" },
  autoHide = "scroll",
  autoHideDelay = 800,
  maxHeight,
}: ScrollableContainerProps) {
  const osRef = useRef<OverlayScrollbarsComponentRef<"div">>(null);

  return (
    <OverlayScrollbarsComponent
      ref={osRef}
      className={cn("os-scrollbar-container", className)}
      style={maxHeight ? { maxHeight } : undefined}
      options={{
        scrollbars: {
          theme: "os-theme-ios",
          visibility: "auto",
          autoHide,
          autoHideDelay,
          autoHideSuspend: false,
          dragScroll: true,
          clickScroll: false,
          pointers: ["mouse", "touch", "pen"],
        },
        overflow,
      }}
      defer
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}
