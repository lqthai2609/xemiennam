"use client";

import { MessageCircle, Phone } from "lucide-react";
import { getZaloChatLink } from "@/lib/zalo";

// Hotline duy nhất dùng xuyên suốt site (site-header, site-footer, các trang chi tiết...) — không tự đặt số khác ở đây.
const hotline = "1900 6789";

export function FloatingContactActions() {
  // Ngày 21 — xem lib/zalo.ts để biết vì sao dùng link trực tiếp thay vì nhúng SDK widget
  // chính thức của Zalo. null khi chưa cấu hình NEXT_PUBLIC_ZALO_OA_ID → ẩn hẳn nút, không
  // hiển thị link "#" chết.
  const zaloLink = getZaloChatLink();

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex gap-3 sm:inset-x-auto sm:right-6 sm:flex-col">
      <a href={`tel:${hotline.replace(/\s/g, "")}`} className="floating-action floating-action-call" aria-label="Gọi ngay cho Xe Miền Nam">
        <Phone data-icon="inline-start" />
        <span>Gọi ngay</span>
      </a>
      {zaloLink && (
        <a
          href={zaloLink}
          target="_blank"
          rel="noopener noreferrer"
          className="floating-action floating-action-zalo"
          aria-label="Chat Zalo với Xe Miền Nam"
        >
          <MessageCircle data-icon="inline-start" />
          <span>Chat Zalo</span>
        </a>
      )}
    </div>
  );
}

export default FloatingContactActions;
