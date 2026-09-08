import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Trang /dich-vu (Ngày 25b) dùng next/image cho ảnh dịch vụ — service.image có thể là
    // featured image thật từ WordPress (embeddedFeaturedImage(), xem lib/api/services.ts),
    // không chỉ ảnh demo tĩnh trong /public. Domain media đã ổn định từ Ngày 3-4 nên khai báo
    // luôn ở đây — cũng là domain dùng cho MediaPhoto (src/components/media-photo.tsx).
    remotePatterns: [
      { protocol: "https", hostname: "xemiennam.datxesaigon.com", pathname: "/wp-content/uploads/**" },
      // data/vehicles.ts (fallback mock khi WP chưa có ảnh xe thật) dùng placehold.co qua
      // lib/placeholder-image.ts — không khai báo domain này thì next/image crash 500 ngay khi
      // rơi vào nhánh fallback (xem ghi chú useMockFallback trong lib/api/vehicles.ts).
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
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
