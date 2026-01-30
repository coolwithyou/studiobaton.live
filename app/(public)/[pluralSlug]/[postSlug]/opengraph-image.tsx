import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";
import { formatKST } from "@/lib/date-utils";
import { getUniqueAuthors } from "@/lib/author-normalizer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { noiseBase64 } from "@/lib/og-noise";
import {
  getContentTypeByPluralSlug,
  getPostByContentTypeAndSlug,
} from "@/lib/actions/content-types";

export const alt = "studiobaton 블로그 포스트";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ pluralSlug: string; postSlug: string }>;
}) {
  const { pluralSlug, postSlug } = await params;

  const [pretendardBold, contentType, post] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Pretendard-Bold.otf")),
    getContentTypeByPluralSlug(pluralSlug),
    (async () => {
      const ct = await getContentTypeByPluralSlug(pluralSlug);
      if (!ct) return null;
      return getPostByContentTypeAndSlug(ct.id, postSlug);
    })(),
  ]);

  const fonts = [
    {
      name: "Pretendard",
      data: pretendardBold,
      style: "normal" as const,
      weight: 700 as const,
    },
  ];

  if (!post || !contentType) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: "linear-gradient(to bottom right, #0a0a0a 0%, #18181b 50%, #0f0f0f 100%)",
            color: "#ffffff",
            fontSize: 48,
            fontFamily: "Pretendard",
            position: "relative",
          }}
        >
          {/* 노이즈 텍스처 오버레이 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url('${noiseBase64}')`,
              backgroundSize: "100px 100px",
              backgroundRepeat: "repeat",
              opacity: 0.06,
            }}
          />
          studiobaton
        </div>
      ),
      { ...size, fonts }
    );
  }

  const dateStr = formatKST(post.targetDate, "yyyy년 M월 d일");

  // 저자 정보 가져오기
  const postWithCommits = await prisma.post.findUnique({
    where: { id: post.id },
    select: {
      commits: {
        select: { author: true, authorEmail: true },
        distinct: ["author"],
        take: 5,
      },
    },
  });

  // Member 테이블 기반 저자 정규화 (동일인 통합)
  const normalizedAuthors = postWithCommits
    ? await getUniqueAuthors(
        postWithCommits.commits.map((c) => ({ author: c.author, authorEmail: c.authorEmail }))
      )
    : [];

  const authorText =
    normalizedAuthors.length > 0
      ? normalizedAuthors
          .slice(0, 3)
          .map((a) => a.name)
          .join(", ")
      : "studiobaton";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundImage: "linear-gradient(to bottom right, #0a0a0a 0%, #18181b 50%, #0f0f0f 100%)",
          padding: 60,
          fontFamily: "Pretendard",
          position: "relative",
        }}
      >
        {/* 노이즈 텍스처 오버레이 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: `url('${noiseBase64}')`,
            backgroundSize: "100px 100px",
            backgroundRepeat: "repeat",
            opacity: 0.06,
          }}
        />
        {/* 상단: 로고 + 날짜 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            studiobaton
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#71717a",
            }}
          >
            {dateStr}
          </div>
        </div>

        {/* 중앙: 제목 */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: post.title && post.title.length > 30 ? 48 : 56,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.3,
              maxWidth: "90%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {post.title || "개발 이야기"}
          </div>
        </div>

        {/* 하단: 저자 + 태그 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#22c55e",
              }}
            />
            <div
              style={{
                fontSize: 20,
                color: "#a1a1aa",
              }}
            >
              {authorText}
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#52525b",
              padding: "8px 16px",
              backgroundColor: "#18181b",
              borderRadius: 8,
            }}
          >
            {contentType.displayName}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    }
  );
}
