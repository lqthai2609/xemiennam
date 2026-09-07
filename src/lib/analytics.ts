/**
 * GA4 + Facebook Pixel — Ngày 22.
 *
 * Đọc thẳng biến môi trường NEXT_PUBLIC_* (tiền tố bắt buộc để Next.js inline giá trị vào
 * bundle client lúc build, dùng được ở cả Server và Client Component — cùng pattern
 * NEXT_PUBLIC_ZALO_OA_ID đã dùng ở Ngày 21, xem lib/zalo.ts).
 *
 * Thiếu biến nào thì phần script/track tương ứng tự tắt hoàn toàn (không render script rỗng,
 * không gọi hàm track khi window.gtag/window.fbq chưa tồn tại) — không throw lỗi, không làm
 * hỏng luồng gửi form khi anh Dúi chưa có tài khoản GA4/Meta Business, hoặc khi trình duyệt
 * khách chặn quảng cáo (ad blocker chặn gtag.js/fbevents.js là chuyện bình thường).
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
 * Bắn sự kiện "gửi yêu cầu đặt xe thành công" — gọi ở đúng 1 chỗ trong
 * contact-booking-form.tsx (component dùng chung, xem Ngày 19), ngay sau khi onSubmit()
 * thành công. Hiện chỉ trang /lien-he dùng component này, nhưng sau này chỗ nào tái dùng form
 * cũng tự có tracking, không cần gắn tay lại.
 *
 * GA4: sự kiện chuẩn "generate_lead" — Google khuyến nghị đặt tên này cho form liên hệ/lead,
 * đánh dấu thành Conversion trong GA4 Admin → Events là bắt đầu đo được ngay.
 * Facebook Pixel: sự kiện chuẩn "Lead" — dùng ngay để tạo Custom Conversion hoặc chạy quảng
 * cáo tối ưu theo lead trên Meta Ads Manager sau này.
 */
export function trackBookingLead(data: { route?: string; vehicleType?: string }) {
  if (typeof window === "undefined") return;

  if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", {
      currency: "VND",
      content_category: data.vehicleType,
      content_name: data.route,
    });
  }

  if (FB_PIXEL_ID && typeof window.fbq === "function") {
    window.fbq("track", "Lead", {
      content_name: data.route,
      content_category: data.vehicleType,
    });
  }
}
