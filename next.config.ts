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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        // 기존 /console/review 경로를 /console/wrap-up으로 리다이렉트
        source: "/console/review",
        destination: "/console/wrap-up",
        permanent: true,
      },
      // 하위 호환성: /admin/* → /console/* 301 리다이렉트
      {
        source: "/admin",
        destination: "/console",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "/console/:path*",
        permanent: true,
      },
      {
        source: "/api/admin/:path*",
        destination: "/api/console/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
