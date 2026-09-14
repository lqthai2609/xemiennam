import { SITE_CONTACT_PHONE } from "@/lib/site-config";

/**
 * Link Zalo dùng chung toàn site.
 *
 * Ưu tiên NEXT_PUBLIC_ZALO_OA_ID khi đã cấu hình Official Account. Trong giai đoạn chưa có
 * OA ID production, fallback về số tư vấn trực tiếp đã cấu hình tập trung ở site-config để
 * CTA Zalo không biến mất khỏi các flow thương mại như pricing_mode=contact.
 */
export const ZALO_OA_ID = process.env.NEXT_PUBLIC_ZALO_OA_ID ?? "";

export function getZaloChatLink(): string {
  const recipient = ZALO_OA_ID.trim() || SITE_CONTACT_PHONE.trim();
  return `https://zalo.me/${recipient}`;
}
