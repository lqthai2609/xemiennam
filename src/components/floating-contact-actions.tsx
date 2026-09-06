"use client";

import { MessageCircle, Phone } from "lucide-react";

// Hotline duy nhất dùng xuyên suốt site (site-header, site-footer, các trang chi tiết...) — không tự đặt số khác ở đây.
const hotline = "1900 6789";

export function FloatingContactActions() {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex gap-3 sm:inset-x-auto sm:right-6 sm:flex-col">
      <a href={`tel:${hotline.replace(/\s/g, "")}`} className="floating-action floating-action-call" aria-label="Gọi ngay cho Xe Miền Nam">
        <Phone data-icon="inline-start" />
        <span>Gọi ngay</span>
      </a>
      {/* Placeholder — nối link Zalo OA thật ở Ngày 21 (tích hợp Zalo OA widget), giống cách nút "Chat Zalo" ở trang chủ hiện cũng đang là placeholder. */}
      <a href="#" className="floating-action floating-action-zalo" aria-label="Chat Zalo với Xe Miền Nam">
        <MessageCircle data-icon="inline-start" />
        <span>Chat Zalo</span>
      </a>
    </div>
  );
}

export default FloatingContactActions;