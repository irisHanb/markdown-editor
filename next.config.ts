import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 없이 정적 파일만 생성 (헌장 원칙 V, FR-016)
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
