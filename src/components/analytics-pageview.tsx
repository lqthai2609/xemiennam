"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FB_PIXEL_ID, GA_MEASUREMENT_ID } from "@/lib/analytics";

/** Track client-side navigations only. The initial page view is emitted by the lazy-loaded
 * analytics bootstrap, which keeps third-party JS away from the critical rendering path. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstEffect = useRef(true);

  useEffect(() => {
    if (isFirstEffect.current) {
      isFirstEffect.current = false;
      return;
    }

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: url });
    }
    if (FB_PIXEL_ID && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

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
