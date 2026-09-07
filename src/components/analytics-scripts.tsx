import Script from "next/script";
import { FB_PIXEL_ID, GA_MEASUREMENT_ID } from "@/lib/analytics";

/**
 * GA4 + Facebook Pixel — Ngày 22. Gắn 1 lần duy nhất ở RootLayout (app/layout.tsx), không lặp
 * lại ở từng trang. `strategy="afterInteractive"` là khuyến nghị chính thức của Next.js cho
 * script analytics — tải sau khi trang đã tương tác được, không chặn render/LCP như nhét thẻ
 * <script> thô ngay trong <head>.
 *
 * `send_page_view: false` trong gtag config: site chuyển trang bằng client-side navigation của
 * Next.js App Router (không reload), nên page_view mặc định của gtag.js chỉ tự bắn đúng 1 lần
 * lúc tải trang đầu tiên. Component AnalyticsPageview (riêng, xem file cùng thư mục) mới là nơi
 * tự bắn page_view cho MỌI lần đổi route sau đó — tắt mặc định ở đây để tránh đếm trùng lượt
 * xem trang đầu.
 *
 * Không render gì (kể cả <noscript>) nếu thiếu biến môi trường tương ứng — xem lib/analytics.ts.
 */
export function AnalyticsScripts() {
  return (
    <>
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
            `}
          </Script>
        </>
      )}

      {FB_PIXEL_ID && (
        <>
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
          {/* Fallback cho trình duyệt tắt JS — đúng chuẩn mã gốc Facebook Pixel cung cấp. */}
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height={1}
              width={1}
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}

export default AnalyticsScripts;
