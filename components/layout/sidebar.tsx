import Link from "next/link";
import { ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { SidebarClient } from "./sidebar-client";

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
      return `/posts?category=${encodeURIComponent(item.postCategory || "")}`;
    default:
      return "/";
  }
}

interface SidebarProps {
  className?: string;
}

export async function Sidebar({ className }: SidebarProps) {
  const sections = await getSideMenu();

  if (sections.length === 0) {
    return null;
  }

  // 클라이언트 컴포넌트에 데이터 전달
  const menuData = sections.map((section) => ({
    id: section.id,
    title: section.title,
    items: section.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: getItemLink(item),
      isExternal: item.linkType === "EXTERNAL",
    })),
  }));

  return <SidebarClient sections={menuData} className={className} />;
}
