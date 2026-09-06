"use client";

import { MessageCircle, Phone } from "lucide-react";

const hotline = "0898400800";

export function FloatingContactActions() {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex gap-3 sm:inset-x-auto sm:right-6 sm:flex-col">
      <a href={`tel:${hotline}`} className="floating-action floating-action-call" aria-label="Gọi ngay cho Xe Miền Nam">
        <Phone data-icon="inline-start" />
        <span>Gọi ngay</span>
      </a>
      <a href="https://zalo.me/0898400800" target="_blank" rel="noreferrer" className="floating-action floating-action-zalo" aria-label="Chat Zalo với Xe Miền Nam">
        <MessageCircle data-icon="inline-start" />
        <span>Chat Zalo</span>
      </a>
    </div>
  );
}

export default FloatingContactActions;
