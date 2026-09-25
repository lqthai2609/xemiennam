/**
 * Consent-aware GA4 events. Meta Pixel stays disabled in this source slice.
 *
 * Đọc thẳng biến môi trường NEXT_PUBLIC_* (tiền tố bắt buộc để Next.js inline giá trị vào
 * bundle client lúc build, dùng được ở cả Server và Client Component — cùng pattern
 * NEXT_PUBLIC_ZALO_OA_ID đã dùng ở Ngày 21, xem lib/zalo.ts).
 *
 * Thiếu GA4 ID thì không tải script hoặc gửi event; tracking cũng tự dừng khi chưa có
 * sự đồng ý hoặc trình duyệt chặn công cụ đo lường. Luồng gửi form vẫn hoạt động.
 */

import { hasMarketingConsent } from "@/lib/marketing-consent";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Bắn sự kiện "gửi yêu cầu đặt xe thành công" sau khi backend đã nhận booking.
 *
 * GA4: sự kiện chuẩn "generate_lead".
 *
 * Không gọi hàm này ở click CTA để tránh đếm lead ảo khi khách chưa hoàn tất booking.
 */
export function trackBookingLead(data: { route?: string; vehicleType?: string }) {
  if (typeof window === "undefined" || !hasMarketingConsent()) return;
  void data; // Free-text route labels may contain private trip details.

  if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", {
      content_category: "booking_request",
    });
  }
}

export type ContactChannel = "phone" | "zalo";

/**
 * Ngày 23 — theo dõi ý định liên hệ qua CTA trực tiếp mà không nâng chúng thành Lead.
 *
 * Dùng event tùy chỉnh để phân biệt rõ với booking submit thành công:
 * - GA4: contact_click
 *
 * Chỉ gửi channel + page_path; không gửi số điện thoại, URL Zalo hoặc dữ liệu định danh.
 */
export function trackContactClick(channel: ContactChannel) {
  if (typeof window === "undefined" || !hasMarketingConsent()) return;

  // Query strings may contain addresses, phone numbers or tokens.
  const pagePath = window.location.pathname;

  if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
    window.gtag("event", "contact_click", {
      contact_method: channel,
      page_path: pagePath,
    });
  }
}
