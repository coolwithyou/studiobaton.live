import { TZDate } from "@date-fns/tz";
import {
  startOfDay as fnsStartOfDay,
  endOfDay as fnsEndOfDay,
  format as fnsFormat,
  subDays as fnsSubDays,
  formatDistanceToNow as fnsFormatDistanceToNow,
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
 * KST 날짜를 PostgreSQL DATE 컬럼 쿼리용 UTC Date로 변환
 * KST의 날짜 부분을 그대로 유지하면서 UTC 자정으로 변환
 *
 * 예: KST 2026-01-21 00:00:00+09:00 → UTC 2026-01-21 00:00:00Z
 *
 * PostgreSQL DATE 컬럼은 시간 정보 없이 날짜만 저장하므로,
 * 쿼리 시 날짜 부분이 정확히 일치해야 함
 */
export function toDateOnlyUTC(date: Date | string): Date {
  const kstDate = toKST(date);
  const year = kstDate.getFullYear();
  const month = kstDate.getMonth();
  const day = kstDate.getDate();
  // UTC 자정으로 새 Date 생성 (KST 날짜 부분 유지)
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
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

/**
 * KST 기준 상대 시간 표시 (예: "3일 전", "방금 전")
 * 서버 시간대(UTC)와 관계없이 항상 KST 기준으로 계산
 */
export function formatDistanceToNowKST(
  date: Date | string,
  options?: { addSuffix?: boolean }
): string {
  const kstDate = toKST(date);
  return fnsFormatDistanceToNow(kstDate, {
    locale: ko,
    addSuffix: options?.addSuffix ?? true,
  });
}
