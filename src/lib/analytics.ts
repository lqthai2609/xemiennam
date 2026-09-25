/**
 * GA4 + Facebook Pixel.
 *
 * Đọc thẳng biến môi trường NEXT_PUBLIC_* (tiền tố bắt buộc để Next.js inline giá trị vào
 * bundle client lúc build, dùng được ở cả Server và Client Component — cùng pattern
 * NEXT_PUBLIC_ZALO_OA_ID đã dùng ở Ngày 21, xem lib/zalo.ts).
 *
 * Thiếu biến nào thì phần script/track tương ứng tự tắt hoàn toàn (không render script rỗng,
 * không gọi hàm track khi window.gtag/window.fbq chưa tồn tại) — không throw lỗi, không làm
 * hỏng luồng gửi form khi chưa có tài khoản GA4/Meta Business, hoặc khi trình duyệt khách
 * chặn quảng cáo.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Bắn sự kiện "gửi yêu cầu đặt xe thành công" sau khi backend đã nhận booking.
 *
 * GA4: sự kiện chuẩn "generate_lead".
 * Facebook Pixel: sự kiện chuẩn "Lead".
 *
 * Không gọi hàm này ở click CTA để tránh đếm lead ảo khi khách chưa hoàn tất booking.
 */
export function trackBookingLead(data: { route?: string; vehicleType?: string }) {
  if (typeof window === "undefined") return;
  void data; // Free-text route labels may contain private trip details.

  if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", {
      content_category: "booking_request",
    });
  }

  if (FB_PIXEL_ID && typeof window.fbq === "function") {
    window.fbq("track", "Lead", { content_category: "booking_request" });
  }
}

export type ContactChannel = "phone" | "zalo";

/**
 * Ngày 23 — theo dõi ý định liên hệ qua CTA trực tiếp mà không nâng chúng thành Lead.
 *
 * Dùng event tùy chỉnh để phân biệt rõ với booking submit thành công:
 * - GA4: contact_click
 * - Meta Pixel: ContactClick (trackCustom)
 *
 * Chỉ gửi channel + page_path; không gửi số điện thoại, URL Zalo hoặc dữ liệu định danh.
 */
export function trackContactClick(channel: ContactChannel) {
  if (typeof window === "undefined") return;

  // Query strings may contain addresses, phone numbers or tokens.
  const pagePath = window.location.pathname;

  if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
    window.gtag("event", "contact_click", {
      contact_method: channel,
      page_path: pagePath,
    });
  }

  if (FB_PIXEL_ID && typeof window.fbq === "function") {
    window.fbq("trackCustom", "ContactClick", {
      contact_method: channel,
      page_path: pagePath,
    });
  }
}
