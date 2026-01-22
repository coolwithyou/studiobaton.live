import prisma from "@/lib/prisma";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { SidebarClient } from "./sidebar-client";

// SidebarClient에서 사용하는 메뉴 데이터 타입 (export)
export interface MenuSection {
  id: string;
  title: string;
  items: {
    id: string;
    title: string;
    href: string;
    isExternal: boolean;
    activePattern?: string | null;
    hasNewPosts?: boolean;
  }[];
}

interface SideMenuSection {
  id: string;
  title: string;
  items: {
    id: string;
    title: string;
    linkType: "INTERNAL" | "EXTERNAL" | "POST_CATEGORY";
    internalPath: string | null;
    externalUrl: string | null;
    postCategory: string | null;
    customSlug: string | null;
    activePattern: string | null;
    contentTypeId: string | null;
    contentType: {
      id: string;
      pluralSlug: string;
    } | null;
  }[];
}

async function getSideMenu(): Promise<SideMenuSection[]> {
  try {
    const sections = await prisma.sideMenuSection.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            title: true,
            linkType: true,
            internalPath: true,
            externalUrl: true,
            postCategory: true,
            customSlug: true,
            activePattern: true,
            contentTypeId: true,
            contentType: {
              select: {
                id: true,
                pluralSlug: true,
              },
            },
          },
        },
      },
    });

    // 아이템이 없는 섹션 필터링
    return sections.filter((s) => s.items.length > 0);
  } catch (error) {
    console.error("Failed to fetch side menu:", error);
    return [];
  }
}

function getItemLink(item: SideMenuSection["items"][0]): string {
  switch (item.linkType) {
    case "INTERNAL":
      return item.internalPath || "/";
    case "EXTERNAL":
      return item.externalUrl || "#";
    case "POST_CATEGORY":
      // ContentType이 연결된 경우 pluralSlug 사용 (권장)
      if (item.contentType?.pluralSlug) {
        return `/${item.contentType.pluralSlug}`;
      }
      // 하위 호환: customSlug가 있으면 해당 경로 사용
      if (item.customSlug) {
        return `/${item.customSlug}`;
      }
      // 하위 호환: 기존 postCategory 방식
      return `/posts?category=${encodeURIComponent(item.postCategory || "")}`;
    default:
      return "/";
  }
}

/**
 * 메뉴 아이템의 activePattern 결정
 * DB에 설정된 값이 있으면 사용, 없으면 POST_CATEGORY일 때 자동 생성
 */
function getItemActivePattern(item: SideMenuSection["items"][0]): string | null {
  // DB에 명시적으로 설정된 activePattern이 있으면 우선 사용
  if (item.activePattern) {
    return item.activePattern;
  }

  // POST_CATEGORY이고 contentType이 있으면 자동 생성
  if (item.linkType === "POST_CATEGORY" && item.contentType?.pluralSlug) {
    // ^/logs 형태로 생성하여 /logs, /logs/xxx 모두 매칭
    return `^/${item.contentType.pluralSlug}`;
  }

  return null;
}

/**
 * 24시간 이내 새 게시물이 있는 ContentType ID 목록 조회
 */
async function getContentTypesWithNewPosts(
  contentTypeIds: string[]
): Promise<Set<string>> {
  if (contentTypeIds.length === 0) return new Set();

  return cache.getOrSet(
    CACHE_KEYS.SIDE_MENU_NEW_POSTS,
    async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const results = await prisma.post.groupBy({
        by: ["contentTypeId"],
        where: {
          contentTypeId: { in: contentTypeIds },
          status: "PUBLISHED",
          publishedAt: { gte: twentyFourHoursAgo },
        },
      });

      return new Set(
        results
          .map((r) => r.contentTypeId)
          .filter((id): id is string => id !== null)
      );
    },
    CACHE_TTL.LONG
  );
}

interface SidebarProps {
  className?: string;
}

export async function Sidebar({ className }: SidebarProps) {
  const sections = await getSideMenu();

  if (sections.length === 0) {
    return null;
  }

  // POST_CATEGORY 아이템의 contentTypeId 수집
  const contentTypeIds = sections
    .flatMap((s) => s.items)
    .filter((item) => item.linkType === "POST_CATEGORY" && item.contentTypeId)
    .map((item) => item.contentTypeId!);

  // 24시간 이내 새 게시물이 있는 contentTypeId 조회
  const newPostsSet = await getContentTypesWithNewPosts(contentTypeIds);

  // 클라이언트 컴포넌트에 데이터 전달
  const menuData = sections.map((section) => ({
    id: section.id,
    title: section.title,
    items: section.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: getItemLink(item),
      isExternal: item.linkType === "EXTERNAL",
      activePattern: getItemActivePattern(item),
      hasNewPosts:
        item.linkType === "POST_CATEGORY" &&
        item.contentTypeId !== null &&
        newPostsSet.has(item.contentTypeId),
    })),
  }));

  return <SidebarClient sections={menuData} className={className} />;
}

/**
 * 사이드메뉴 데이터를 가져오는 함수 (layout.tsx에서 사용)
 * MobileNav와 Sidebar 컴포넌트 모두에 데이터를 전달하기 위해 export
 */
export async function getSideMenuSections(): Promise<MenuSection[]> {
  const sections = await getSideMenu();

  if (sections.length === 0) {
    return [];
  }

  // POST_CATEGORY 아이템의 contentTypeId 수집
  const contentTypeIds = sections
    .flatMap((s) => s.items)
    .filter((item) => item.linkType === "POST_CATEGORY" && item.contentTypeId)
    .map((item) => item.contentTypeId!);

  // 24시간 이내 새 게시물이 있는 contentTypeId 조회
  const newPostsSet = await getContentTypesWithNewPosts(contentTypeIds);

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    items: section.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: getItemLink(item),
      isExternal: item.linkType === "EXTERNAL",
      activePattern: getItemActivePattern(item),
      hasNewPosts:
        item.linkType === "POST_CATEGORY" &&
        item.contentTypeId !== null &&
        newPostsSet.has(item.contentTypeId),
    })),
  }));
}
