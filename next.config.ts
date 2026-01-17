import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom ESM/CommonJS 호환성 문제 해결 (Vercel 서버리스 환경)
  // Prisma 관련 패키지 추가 (Edge/Serverless 번들링 이슈 해결)
  serverExternalPackages: [
    "jsdom",
    "isomorphic-dompurify",
    "@prisma/client",
    "@prisma/client-runtime-utils",
    "@prisma/adapter-pg",
    "pg",
  ],
  async redirects() {
    return [
      {
        // 기존 /admin/review 경로를 /admin/wrap-up으로 리다이렉트
        source: "/admin/review",
        destination: "/admin/wrap-up",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
