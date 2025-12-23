import { format } from "date-fns";

interface HolidayItem {
  date: string; // "20250101" 형식
  dateName: string;
  isHoliday: "Y" | "N";
}

interface RawHolidayItem {
  locdate: number | string;
  dateName: string;
  isHoliday: "Y" | "N";
}

interface HolidayResponse {
  date: string; // "2025-01-01" 형식
  name: string;
  isHoliday: boolean;
}

// 메모리 캐시 (연도별)
const holidayCache = new Map<number, HolidayItem[]>();

export async function getKoreanHolidays(year: number): Promise<HolidayItem[]> {
  // 캐시 확인
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  const serviceKey = process.env.DATA_GO_KR_API_KEY;
  if (!serviceKey) {
    console.error("DATA_GO_KR_API_KEY is not set");
    return [];
  }

  const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`;

  const params = new URLSearchParams({
    serviceKey: serviceKey,
    solYear: year.toString(),
    numOfRows: "100",
    _type: "json",
  });

  try {
    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    const items = data.response?.body?.items?.item;
    if (!items) {
      return [];
    }

    // 단일 항목일 경우 배열로 변환
    const rawItems: RawHolidayItem[] = Array.isArray(items) ? items : [items];

    // 날짜 형식 정규화
    const normalizedItems: HolidayItem[] = rawItems.map((item) => ({
      date: String(item.locdate),
      dateName: item.dateName,
      isHoliday: item.isHoliday as "Y" | "N",
    }));

    holidayCache.set(year, normalizedItems);
    return normalizedItems;
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return [];
  }
}

export async function isHoliday(date: Date): Promise<boolean> {
  const year = date.getFullYear();
  const holidays = await getKoreanHolidays(year);

  const dateStr = format(date, "yyyyMMdd");
  return holidays.some((h) => h.date === dateStr && h.isHoliday === "Y");
}

export async function getHolidaysInRange(
  startDate: Date,
  endDate: Date
): Promise<Set<string>> {
  const holidays = new Set<string>();

  // 해당 연도들의 공휴일 조회
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = await getKoreanHolidays(year);

    for (const holiday of yearHolidays) {
      if (holiday.isHoliday === "Y") {
        // "20250101" -> "2025-01-01" 변환
        const formatted = `${holiday.date.slice(0, 4)}-${holiday.date.slice(4, 6)}-${holiday.date.slice(6, 8)}`;
        holidays.add(formatted);
      }
    }
  }

  return holidays;
}

export async function getHolidaysForYear(
  year: number
): Promise<HolidayResponse[]> {
  const holidays = await getKoreanHolidays(year);

  return holidays
    .filter((h) => h.isHoliday === "Y")
    .map((h) => ({
      date: `${h.date.slice(0, 4)}-${h.date.slice(4, 6)}-${h.date.slice(6, 8)}`,
      name: h.dateName,
      isHoliday: true,
    }));
}
