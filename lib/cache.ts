/**
 * 통합 캐싱 유틸리티
 * 메모리 기반 TTL 캐시
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5분

  /**
   * 캐시에서 값을 가져오거나, 없으면 fetcher를 실행하여 캐시에 저장
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expiresAt > now) {
      return entry.value;
    }

    const value = await fetcher();
    this.cache.set(key, {
      value,
      expiresAt: now + ttl,
    });

    return value;
  }

  /**
   * 캐시에서 값을 가져옴 (없으면 undefined)
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * 캐시에 값을 저장
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * 특정 키의 캐시를 무효화
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 패턴에 맞는 모든 키의 캐시를 무효화
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 모든 캐시를 무효화
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 항목 정리
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 캐시 통계
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 싱글톤 인스턴스
export const cache = new MemoryCache();

// 캐시 키 상수
export const CACHE_KEYS = {
  PROJECT_MAPPINGS: "project-mappings",
  HOLIDAYS: (year: number) => `holidays:${year}`,
  POSTS_LIST: (page: number, limit: number, status?: string) =>
    `posts:list:${page}:${limit}:${status || "all"}`,
  POST_DETAIL: (slug: string) => `posts:detail:${slug}`,
  STATS: (startDate: string, endDate: string) =>
    `stats:${startDate}:${endDate}`,
} as const;

// TTL 상수
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1분
  MEDIUM: 5 * 60 * 1000, // 5분
  LONG: 30 * 60 * 1000, // 30분
  HOUR: 60 * 60 * 1000, // 1시간
  DAY: 24 * 60 * 60 * 1000, // 24시간
} as const;

/**
 * HTTP Cache-Control 헤더 생성
 */
export function createCacheHeaders(
  maxAge: number,
  options: {
    public?: boolean;
    staleWhileRevalidate?: number;
    staleIfError?: number;
    noStore?: boolean;
    noCache?: boolean;
  } = {}
): Headers {
  const headers = new Headers();

  if (options.noStore) {
    headers.set("Cache-Control", "no-store");
    return headers;
  }

  if (options.noCache) {
    headers.set("Cache-Control", "no-cache");
    return headers;
  }

  const directives: string[] = [];

  if (options.public) {
    directives.push("public");
  } else {
    directives.push("private");
  }

  directives.push(`max-age=${Math.floor(maxAge / 1000)}`);

  if (options.staleWhileRevalidate) {
    directives.push(
      `stale-while-revalidate=${Math.floor(options.staleWhileRevalidate / 1000)}`
    );
  }

  if (options.staleIfError) {
    directives.push(
      `stale-if-error=${Math.floor(options.staleIfError / 1000)}`
    );
  }

  headers.set("Cache-Control", directives.join(", "));

  return headers;
}
