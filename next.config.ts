import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    // Ngày 25: gộp "Đội xe" vào "Loại xe" — /doi-xe không còn route riêng, giữ redirect
    // để URL cũ (nếu đã được chia sẻ/lưu ở đâu đó) không rơi vào 404.
    return [
      { source: "/doi-xe", destination: "/loai-xe", permanent: true },
      { source: "/doi-xe/:slug", destination: "/loai-xe/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
