import { TZDate } from "@date-fns/tz";
import {
  startOfDay as fnsStartOfDay,
  endOfDay as fnsEndOfDay,
  format as fnsFormat,
  subDays as fnsSubDays,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 한국 타임존 상수
 */
export const KST_TIMEZONE = "Asia/Seoul";

/**
 * KST 기준 현재 시간 반환
 */
export function nowKST(): TZDate {
  return new TZDate(new Date(), KST_TIMEZONE);
}

/**
 * 주어진 날짜를 KST TZDate로 변환
 */
export function toKST(date: Date | string): TZDate {
  const d = typeof date === "string" ? parseISO(date) : date;
  return new TZDate(d, KST_TIMEZONE);
}

/**
 * KST 기준 하루의 시작 (00:00:00.000)
 */
export function startOfDayKST(date: Date | string = new Date()): Date {
  const kstDate = toKST(date);
  return fnsStartOfDay(kstDate);
}

/**
 * KST 기준 하루의 끝 (23:59:59.999)
 */
export function endOfDayKST(date: Date | string = new Date()): Date {
  const kstDate = toKST(date);
  return fnsEndOfDay(kstDate);
}

/**
 * KST 기준 오늘인지 확인
 */
export function isTodayKST(date: Date): boolean {
  const todayStr = formatKST(nowKST(), "yyyy-MM-dd");
  const dateStr = formatKST(date, "yyyy-MM-dd");
  return todayStr === dateStr;
}

/**
 * KST 기준 날짜 포맷팅
 */
export function formatKST(
  date: Date | string,
  formatStr: string,
  options?: { locale?: typeof ko }
): string {
  const kstDate = toKST(date);
  return fnsFormat(kstDate, formatStr, { locale: ko, ...options });
}

/**
 * KST 기준 N일 전 날짜
 */
export function subDaysKST(date: Date | string, amount: number): Date {
  const kstDate = toKST(date);
  return fnsSubDays(kstDate, amount);
}

/**
 * 날짜 문자열을 KST 기준 날짜 범위로 변환 (DB 쿼리용)
 * @returns { start: Date, end: Date } - UTC 타임스탬프로 저장된 DB 쿼리에 사용
 */
export function getKSTDayRange(date: Date | string): { start: Date; end: Date } {
  return {
    start: startOfDayKST(date),
    end: endOfDayKST(date),
  };
}
