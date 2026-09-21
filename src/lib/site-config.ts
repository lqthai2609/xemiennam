/**
 * Hằng số dùng chung cho SEO, schema và thông tin liên hệ của Alo Đặt Xe.
 *
 * SITE_URL: đọc từ NEXT_PUBLIC_SITE_URL — fallback về domain tạm Vercel cho tới khi
 * domain chính thức được cấu hình. Đổi trong environment, không sửa code theo từng deploy.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://xemiennam.vercel.app").replace(/\/$/, "");

export const SITE_NAME = "Alo Đặt Xe";
export const SITE_HOTLINE = "0898 400 800";
/** Dạng E.164 không dấu cách — dùng cho JSON-LD `telephone` và tel links. */
export const SITE_HOTLINE_TEL = "+84898400800";

/**
 * Số tư vấn trực tiếp/Zalo. Cho phép override bằng environment để không phải hard-code
 * business config tại từng component. Fallback giữ đúng số đang dùng trên site hiện tại.
 */
export const SITE_CONTACT_PHONE = (process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "0898400800").replace(/\D/g, "");
export const SITE_CONTACT_PHONE_DISPLAY =
  SITE_CONTACT_PHONE.length === 10
    ? `${SITE_CONTACT_PHONE.slice(0, 4)} ${SITE_CONTACT_PHONE.slice(4, 7)} ${SITE_CONTACT_PHONE.slice(7)}`
    : SITE_CONTACT_PHONE;
export const SITE_CONTACT_PHONE_TEL = SITE_CONTACT_PHONE.startsWith("0")
  ? `+84${SITE_CONTACT_PHONE.slice(1)}`
  : SITE_CONTACT_PHONE.startsWith("+")
    ? SITE_CONTACT_PHONE
    : `+${SITE_CONTACT_PHONE}`;

export const SITE_DESCRIPTION =
  "Alo Đặt Xe cung cấp dịch vụ cho thuê xe nguyên chiếc 4–45 chỗ và limousine cho các tuyến Sài Gòn, sân bay và khu vực Nam Bộ — chủ động giờ giấc, an toàn và minh bạch.";

/** Khu vực phục vụ — dùng cho `areaServed` trong Service schema. */
export const SITE_AREA_SERVED = ["TP. Hồ Chí Minh", "Vũng Tàu", "Cần Thơ", "Đà Lạt", "Miền Nam"];
