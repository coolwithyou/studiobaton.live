"use client";

import { useEffect } from "react";
import { OverlayScrollbars } from "overlayscrollbars";
import "overlayscrollbars/overlayscrollbars.css";

export function ScrollbarProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // body에 전역 스크롤바 적용
    const osInstance = OverlayScrollbars(document.body, {
      scrollbars: {
        theme: "os-theme-ios",
        visibility: "auto",
        autoHide: "scroll",
        autoHideDelay: 800,
        autoHideSuspend: false,
        dragScroll: true,
        clickScroll: false,
        pointers: ["mouse", "touch", "pen"],
      },
      overflow: {
        x: "hidden",
        y: "scroll",
      },
    });

    return () => {
      osInstance?.destroy();
    };
  }, []);

  return <>{children}</>;
}
