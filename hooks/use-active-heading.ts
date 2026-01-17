"use client";

import { useState, useEffect, useRef } from "react";

/**
 * 스크롤 위치에 따라 현재 활성화된 헤딩을 감지하는 훅
 * Intersection Observer를 사용하여 성능 최적화
 */
export function useActiveHeading(headingIds: string[]) {
  const [activeId, setActiveId] = useState<string>("");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headingIds.length === 0) return;

    // 기존 observer 정리
    observer.current?.disconnect();

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      // 보이는 헤딩들 중 가장 상단에 있는 것 선택
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);

      if (visibleEntries.length > 0) {
        // boundingClientRect.top 기준 정렬 후 첫 번째 선택
        const sorted = visibleEntries.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );
        setActiveId(sorted[0].target.id);
      }
    };

    observer.current = new IntersectionObserver(handleIntersect, {
      // 상단 20% 진입 시 활성화, 하단 40%는 무시
      rootMargin: "-20% 0px -40% 0px",
      threshold: 0,
    });

    // 헤딩 요소들 관찰
    headingIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.current?.observe(element);
      }
    });

    // 초기 활성 헤딩 설정 (첫 번째 헤딩)
    if (!activeId && headingIds.length > 0) {
      setActiveId(headingIds[0]);
    }

    return () => {
      observer.current?.disconnect();
    };
  }, [headingIds, activeId]);

  return activeId;
}
