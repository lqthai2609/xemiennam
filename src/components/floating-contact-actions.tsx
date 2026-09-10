"use client";

import { MessageCircle, Phone } from "lucide-react";

const hotline = "0898400800";
const zaloLink = `https://zalo.me/${hotline}`;

export function FloatingContactActions() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-row gap-2 bg-background p-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:flex-col sm:bg-transparent sm:p-0">
      <a
        href={`tel:${hotline}`}
        className="floating-action floating-action-call flex-1 justify-center sm:flex-none"
        aria-label={`Gọi ${hotline} cho Xe Miền Nam`}
      >
        <Phone data-icon="inline-start" />
        <span>Gọi ngay</span>
      </a>

      <a
        href={zaloLink}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-action floating-action-zalo flex-1 justify-center sm:flex-none"
        aria-label={`Nhắn Zalo ${hotline} với Xe Miền Nam`}
      >
        <MessageCircle data-icon="inline-start" />
        <span>Nhắn Zalo</span>
      </a>
    </div>
  );
}

export default FloatingContactActions;
