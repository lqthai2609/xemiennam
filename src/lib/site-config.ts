/**
 * Hằng số dùng chung cho SEO (Ngày 23) — sitemap.ts, robots.ts, JSON-LD schema.
 *
 * SITE_URL: đọc từ NEXT_PUBLIC_SITE_URL — fallback về domain tạm Vercel (đúng điều chỉnh
 * ở mục 10 kiến trúc kỹ thuật: chạy thật ở xemiennam.vercel.app cho tới khi mua domain thật
 * ở Ngày 29). Đổi giá trị này trong .env.local/Vercel khi có domain thật, không sửa code.
 * Tiền tố NEXT_PUBLIC_ vì sitemap.ts/generateMetadata() và JSON-LD render ở cả server lẫn
 * client component (giống cách NEXT_PUBLIC_ZALO_OA_ID đang dùng ở lib/zalo.ts).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://xemiennam.vercel.app").replace(/\/$/, "");

export const SITE_NAME = "Xe Miền Nam";
export const SITE_HOTLINE = "1900 6789";
/** Dạng E.164 không dấu cách — dùng cho JSON-LD `telephone` (schema.org yêu cầu định dạng gọi được, không phải chuỗi hiển thị "1900 6789"). */
export const SITE_HOTLINE_TEL = "+8419006789";
export const SITE_DESCRIPTION =
  "Dịch vụ cho thuê xe nguyên chiếc 4–45 chỗ và limousine các tuyến TP.HCM và khu vực Nam Bộ — chủ động giờ giấc, không theo lịch cố định.";

/** Khu vực phục vụ — dùng cho `areaServed` trong Service schema. Khớp taxonomy `province` (Ngày 3). */
export const SITE_AREA_SERVED = ["TP. Hồ Chí Minh", "Vũng Tàu", "Cần Thơ", "Đà Lạt", "Miền Nam"];
