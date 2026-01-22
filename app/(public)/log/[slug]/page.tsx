import { redirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * /log/[slug] → /logs/[slug] 리다이렉트
 *
 * 기존 URL 패턴 (/log/...) 에서 새 URL 패턴 (/logs/...) 으로
 * SEO 친화적인 301 영구 리다이렉트를 수행합니다.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function LogRedirectPage({ params }: PageProps) {
  const { slug } = await params;

  // 301 영구 리다이렉트 (SEO 점수 이전)
  redirect(`/logs/${slug}`);
}
