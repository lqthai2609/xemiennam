import type { NavItem } from "@/components/site-header";

/** Menu chung cho tất cả các trang công khai. */
export const navItems: NavItem[] = [
  { label: "Tuyến đường", href: "/tuyen-duong" },
  { label: "Điểm đến", href: "/diem-den", children: [
    { label: "Bà Rịa - Vũng Tàu", href: "/tuyen-duong/ba-ria-vung-tau" },
    { label: "Đồng Nai", href: "/tuyen-duong/dong-nai" },
    { label: "Cần Thơ", href: "/tuyen-duong/can-tho" },
    { label: "Tây Ninh", href: "/tuyen-duong/tay-ninh" },
    { label: "Bến Tre", href: "/tuyen-duong/ben-tre" },
    { label: "Tất cả điểm đến", href: "/diem-den" },
  ] },
  { label: "Loại xe", href: "/loai-xe", children: [
    { label: "Xe 4 chỗ", href: "/loai-xe/4-cho" },
    { label: "Xe 7 chỗ", href: "/loai-xe/7-cho" },
    { label: "Xe 16 chỗ", href: "/loai-xe/16-cho" },
    { label: "Xe 29 chỗ", href: "/loai-xe/29-cho" },
    { label: "Xe 45 chỗ", href: "/loai-xe/45-cho" },
    { label: "Limousine", href: "/loai-xe/limousine" },
  ] },
  { label: "Dịch vụ", href: "/dich-vu" },
  { label: "Bảng giá", href: "/bang-gia" },
  { label: "Khuyến mãi", href: "/khuyen-mai" },
  { label: "Blog", href: "/blog" },
  { label: "Đánh giá", href: "/danh-gia" },
  { label: "Liên hệ", href: "/lien-he" },
];
