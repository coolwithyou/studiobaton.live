import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { SITE_URL } from "@/lib/config";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 발행된 포스트 가져오기
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      slug: true,
      type: true,
      updatedAt: true,
      publishedAt: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  // 활성화된 ContentType 목록 가져오기
  const contentTypes = await prisma.contentType.findMany({
    where: { isActive: true },
    select: { pluralSlug: true },
  });

  const postUrls = posts.map((post) => ({
    url: `${SITE_URL}/${post.type === "COMMIT_BASED" ? "log" : "post"}/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // 정적 페이지 URL
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/members`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/updates`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/posts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // ContentType 목록 페이지 URL
  const contentTypeUrls: MetadataRoute.Sitemap = contentTypes.map((ct) => ({
    url: `${SITE_URL}/${ct.pluralSlug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...staticUrls,
    ...contentTypeUrls,
    ...postUrls,
  ];
}
