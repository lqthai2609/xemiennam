/**
 * Link Zalo OA dùng chung toàn site (Ngày 21) — nút nổi FloatingContactActions và
 * dòng "Tổng đài & Zalo hỗ trợ" ở trang /lien-he.
 *
 * Đọc thẳng process.env.NEXT_PUBLIC_ZALO_OA_ID — tiền tố NEXT_PUBLIC_ khiến Next.js inline
 * giá trị này vào bundle client lúc build, nên dùng được ở cả Server Component lẫn Client
 * Component (không cần gọi API riêng để lấy).
 *
 * CHỦ ĐỘNG không nhúng script chính thức của Zalo (sp.zalo.me/plugins/sdk.js +
 * <div class="zalo-chat-widget">) — script đó tự vẽ thêm 1 bong bóng chat nổi riêng ở góc
 * phải màn hình, sẽ chồng lên FloatingContactActions đã tự thiết kế từ Ngày 19 (2 bong bóng
 * nổi cùng chỗ, xấu và gây nhầm lẫn). Dùng thẳng link https://zalo.me/<oaid> — bấm vào sẽ mở
 * app Zalo trên điện thoại hoặc Zalo Web trên máy tính, vẫn đúng mục tiêu "tư vấn trực tiếp
 * qua Zalo" của Ngày 21, chỉ khác là dùng UI nút bấm đã có sẵn thay vì để Zalo tự vẽ UI riêng.
 *
 * Lấy Official Account ID ở đâu: đăng nhập oa.zalo.me → chọn OA của Xe Miền Nam → vào phần
 * quản trị/thông tin OA sẽ thấy "ID Official Account" (1 dãy số dài, KHÔNG phải username hay
 * tên hiển thị). Dán dãy số đó vào NEXT_PUBLIC_ZALO_OA_ID trong .env.local (và trong Vercel
 * Project Settings → Environment Variables cho bản deploy thật, giống cách làm với các biến
 * WP_JWT_* / REVALIDATE_SECRET ở Ngày 20).
 */
export const ZALO_OA_ID = process.env.NEXT_PUBLIC_ZALO_OA_ID ?? "";

/**
 * Trả về link chat Zalo, hoặc null nếu chưa cấu hình NEXT_PUBLIC_ZALO_OA_ID — nơi gọi tự
 * quyết định ẩn nút/link đi khi null, thay vì hiển thị 1 link "#" chết trên production.
 */
export function getZaloChatLink(): string | null {
  const oaId = ZALO_OA_ID.trim();
  return oaId ? `https://zalo.me/${oaId}` : null;
}
