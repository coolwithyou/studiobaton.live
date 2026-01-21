"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface HeadingPosition {
  id: string;
  top: number;
}

/**
 * 스크롤 위치에 따라 현재 활성화된 헤딩을 감지하는 훅
 *
 * 개선 사항:
 * - 스크롤 이벤트 기반으로 빠른 스크롤에도 정확한 감지
 * - requestAnimationFrame으로 성능 최적화
 * - 뷰포트 상단 오프셋 기반 활성 헤딩 결정
 */
export function useActiveHeading(headingIds: string[]) {
  const [activeId, setActiveId] = useState<string>("");
  const rafRef = useRef<number | null>(null);

  // 뷰포트 상단에서 이 오프셋 이내에 있는 헤딩이 활성화됨
  const ACTIVE_OFFSET = 100;

  // 헤딩 위치 계산
  const calculatePositions = useCallback((): HeadingPosition[] => {
    return headingIds
      .map((id) => {
        const element = document.getElementById(id);
        if (!element) return null;
        return { id, top: element.getBoundingClientRect().top };
      })
      .filter((pos): pos is HeadingPosition => pos !== null);
  }, [headingIds]);

  // 활성 헤딩 결정
  const determineActiveHeading = useCallback(
    (positions: HeadingPosition[]): string => {
      if (positions.length === 0) return "";

      // 오프셋 이하에 있는 헤딩들 (상단 근처 또는 위로 지나간 헤딩)
      const passedHeadings = positions.filter(
        (pos) => pos.top <= ACTIVE_OFFSET
      );

      if (passedHeadings.length > 0) {
        // 지나간 헤딩 중 가장 아래(최근 통과) 헤딩 선택
        return passedHeadings.reduce((closest, current) =>
          current.top > closest.top ? current : closest
        ).id;
      }

      // 모든 헤딩이 아직 오프셋 아래에 있으면 첫 번째 헤딩
      return positions[0].id;
    },
    []
  );

  // 스크롤 핸들러 (RAF throttle)
  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const positions = calculatePositions();
      const newActiveId = determineActiveHeading(positions);

      setActiveId((prev) => (prev !== newActiveId ? newActiveId : prev));
    });
  }, [calculatePositions, determineActiveHeading]);

  useEffect(() => {
    if (headingIds.length === 0) return;

    // 초기 활성 헤딩 설정
    const positions = calculatePositions();
    setActiveId(determineActiveHeading(positions));

    // 이벤트 리스너 등록
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [headingIds, calculatePositions, determineActiveHeading, handleScroll]);

  return activeId;
}
