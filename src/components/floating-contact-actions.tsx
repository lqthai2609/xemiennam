"use client";

import { MessageCircle, Phone } from "lucide-react";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_CONTACT_PHONE, SITE_CONTACT_PHONE_TEL, SITE_NAME } from "@/lib/site-config";

export function FloatingContactActions() {
  const zaloLink = getZaloChatLink();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-row gap-2 bg-background p-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:flex-col sm:bg-transparent sm:p-0">
      <a
        href={`tel:${SITE_CONTACT_PHONE_TEL}`}
        className="floating-action floating-action-call flex-1 justify-center sm:flex-none"
        aria-label={`Gọi ${SITE_CONTACT_PHONE} cho ${SITE_NAME}`}
      >
        <Phone data-icon="inline-start" />
        <span>Gọi ngay</span>
      </a>

      <a
        href={zaloLink}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-action floating-action-zalo flex-1 justify-center sm:flex-none"
        aria-label={`Nhắn Zalo ${SITE_CONTACT_PHONE} với ${SITE_NAME}`}
      >
        <MessageCircle data-icon="inline-start" />
        <span>Nhắn Zalo</span>
      </a>
    </div>
  );
}

export default FloatingContactActions;
