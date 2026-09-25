"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID, trackContactClick } from "@/lib/analytics";
import { hasMarketingConsent } from "@/lib/marketing-consent";

/** Track client-side navigations only. The initial page view is emitted by the lazy-loaded
 * analytics bootstrap, which keeps third-party JS away from the critical rendering path. */
function PageviewTracker() {
  const pathname = usePathname();
  const isFirstEffect = useRef(true);

  useEffect(() => {
    if (!hasMarketingConsent()) return;
    if (isFirstEffect.current) {
      isFirstEffect.current = false;
      return;
    }

    if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: pathname });
    }
  }, [pathname]);

  useEffect(() => {
    function handleContactClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      const rawHref = anchor?.getAttribute("href")?.trim();
      if (!anchor || !rawHref) return;

      if (rawHref.toLowerCase().startsWith("tel:")) {
        trackContactClick("phone");
        return;
      }

      try {
        const url = new URL(anchor.href, window.location.href);
        const hostname = url.hostname.toLowerCase();
        if (hostname === "zalo.me" || hostname.endsWith(".zalo.me")) {
          trackContactClick("zalo");
        }
      } catch {
        // URL không hợp lệ thì bỏ qua; tracking không được làm ảnh hưởng hành vi CTA.
      }
    }

    document.addEventListener("click", handleContactClick);
    return () => document.removeEventListener("click", handleContactClick);
  }, []);

  return null;
}

export function AnalyticsPageview() {
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}

export default AnalyticsPageview;
