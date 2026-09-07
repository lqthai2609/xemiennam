"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FB_PIXEL_ID, GA_MEASUREMENT_ID } from "@/lib/analytics";

/**
 * Bắn page_view (GA4) + PageView (Facebook Pixel) mỗi khi đổi route bằng client-side
 * navigation — xem ghi chú send_page_view:false ở analytics-scripts.tsx để hiểu vì sao cần
 * component riêng này thay vì để gtag.js/fbevents.js tự lo hết.
 *
 * Bọc trong <Suspense>: useSearchParams() bắt buộc phải có Suspense boundary bao quanh trong
 * App Router (Next.js báo lỗi build nếu thiếu) — fallback để null vì component không render UI
 * gì cả, chỉ side-effect.
 */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
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
