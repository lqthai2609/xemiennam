import type { NavItem } from "@/components/site-header";

/**
 * Menu chính — DÙNG CHUNG cho mọi trang (Home, RoutesPage, RouteDetailPage...).
 * Trỏ thẳng vào route thật theo sitemap đã chốt (mục 4, kiến trúc kỹ thuật),
 * không dùng anchor (#...) nữa. Vài route dưới đây CHƯA build (sẽ 404 tạm
 * cho tới đúng ngày trong lộ trình) — chấp nhận được, cùng nguyên tắc đã áp
 * dụng cho link /loai-xe/[slug] ở trang chi tiết tuyến: có link thật ngay từ
 * đầu tốt hơn cho SEO/internal-link, hơn là chờ đủ trang mới nối.
 *
 *   /doi-xe     → Ngày 11   /loai-xe    → Ngày 13   /dich-vu → Ngày 13
 *   /bang-gia   → Ngày 15   /khuyen-mai → Ngày 18   /blog    → Ngày 17
 *   /danh-gia   → Ngày 18   /lien-he    → chưa có ngày riêng, xem ghi chú dưới
 */
export const navItems: NavItem[] = [
  { label: "Tuyến đường", href: "/tuyen-duong" },
  { label: "Đội xe", href: "/doi-xe" },
  { label: "Loại xe", href: "/loai-xe" },
  { label: "Dịch vụ", href: "/dich-vu" },
  { label: "Bảng giá", href: "/bang-gia" },
  { label: "Khuyến mãi", href: "/khuyen-mai" },
  { label: "Blog", href: "/blog" },
  { label: "Đánh giá", href: "/danh-gia" },
  { label: "Liên hệ", href: "/lien-he" },
];
