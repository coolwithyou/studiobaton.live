import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
