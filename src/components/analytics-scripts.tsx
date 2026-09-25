"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { hasMarketingConsent, subscribeMarketingConsent } from "@/lib/marketing-consent";

/**
 * Analytics is deliberately loaded after the browser load event so third-party JS does not
 * compete with the LCP image, hydration and the first user interaction. GA4 sends the initial
 * page_view from its config call; client-side route changes are tracked by AnalyticsPageview.
 */
export function AnalyticsScripts() {
  const allowed = useSyncExternalStore(subscribeMarketingConsent, hasMarketingConsent, () => false);
  if (!allowed) return null;
  return (
    <>
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-init" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_location: window.location.origin + window.location.pathname,
                page_path: window.location.pathname,
                page_referrer: '',
                cookie_expires: 2592000,
                cookie_update: false,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
              });
            `}
          </Script>
        </>
      )}
    </>
  );
}

export default AnalyticsScripts;
