"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useScramble } from "use-scramble";

interface ScrambleTextProps {
  /** 순환할 텍스트 배열 (최소 1개) */
  texts: string[];
  /** 애니메이션 반복 여부 (기본: true) */
  loop?: boolean;
  /** 반복 간격 - 애니메이션 완료 후 다음 재생까지 대기 시간 (ms, 기본: 3000) */
  loopInterval?: number;
  /** 타이핑 속도 (0.1-1.0, 높을수록 빠름, 기본: 0.6) */
  speed?: number;
  /** 스크램블 강도 - 각 문자의 랜덤화 횟수 (1-10, 기본: 4) */
  scrambleIntensity?: number;
  /** 스타일 클래스 */
  className?: string;
  /** 접근성: 스크린 리더용 라벨 */
  ariaLabel?: string;
}

// 기본 설정값 (yugop 스타일)
const DEFAULT_CONFIG = {
  loop: true,
  loopInterval: 3000,
  speed: 0.6,
  scrambleIntensity: 4,
  seed: 2,
  tick: 1,
  overdrive: 3,
} as const;

export function ScrambleText({
  texts,
  loop = DEFAULT_CONFIG.loop,
  loopInterval = DEFAULT_CONFIG.loopInterval,
  speed = DEFAULT_CONFIG.speed,
  scrambleIntensity = DEFAULT_CONFIG.scrambleIntensity,
  className = "",
  ariaLabel,
}: ScrambleTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // reduced-motion 감지
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const currentText = texts[currentIndex] ?? texts[0];
  const hasMultipleTexts = texts.length > 1;

  // 타이머 정리
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 다음 텍스트로 전환 또는 같은 텍스트 재생
  const scheduleNext = useCallback(() => {
    if (!isMountedRef.current || !loop) return;

    clearTimer();
    timerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      if (hasMultipleTexts) {
        // 여러 텍스트: 다음 인덱스로
        setCurrentIndex((prev) => (prev + 1) % texts.length);
      } else {
        // 단일 텍스트: 키 변경으로 리플레이 트리거
        setAnimationKey((prev) => prev + 1);
      }
    }, loopInterval);
  }, [loop, loopInterval, hasMultipleTexts, texts.length, clearTimer]);

  // use-scramble 훅
  const { ref: scrambleRef, replay } = useScramble({
    text: prefersReducedMotion ? "" : currentText,
    speed: speed,
    scramble: scrambleIntensity,
    seed: DEFAULT_CONFIG.seed,
    tick: DEFAULT_CONFIG.tick,
    overdrive: DEFAULT_CONFIG.overdrive,
    playOnMount: !prefersReducedMotion,
    onAnimationEnd: scheduleNext,
  });

  // 텍스트 또는 키 변경 시 스크램블 재생
  useEffect(() => {
    if (!prefersReducedMotion) {
      replay();
    }
  }, [currentIndex, animationKey, prefersReducedMotion, replay]);

  // 클린업
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  // 애니메이션 비활성화 시 정적 텍스트
  if (prefersReducedMotion) {
    return (
      <span className={className} aria-label={ariaLabel ?? currentText}>
        {currentText}
      </span>
    );
  }

  return (
    <span
      className={className}
      aria-label={ariaLabel ?? texts.join(" / ")}
      aria-live="polite"
      aria-atomic="true"
    >
      <span ref={scrambleRef} aria-hidden="true" />
    </span>
  );
}
