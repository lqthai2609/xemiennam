"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { ContactBookingForm, type BookingFormData } from "@/components/contact-booking-form";
import { navItems } from "@/data/nav";
import { getZaloChatLink } from "@/lib/zalo";
import { UnifiedHero } from "@/components/unified-hero";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { HO_CHI_MINH_PUBLIC_LABEL } from "@/lib/public-location-label";
import { fetchBookingWithIdempotency } from "@/lib/booking-submit";

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Bảng giá", href: "/bang-gia" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

/**
 * Trang /lien-he (Ngày 19) — nhận `routeOptions`/`vehicleTypeOptions` qua props từ Server
 * Component cha (app/lien-he/page.tsx, đã fetchRoutes() thật). Hỗ trợ prefill sẵn tuyến quan
 * tâm qua ?tuyen=<tên tuyến> (vd link từ nút "Gửi yêu cầu tư vấn" ở trang dịch vụ) — đọc trực
 * tiếp window.location trong useEffect, giống đúng cách routes-page-client.tsx đang làm, để
 * không phải bọc Suspense quanh trang.
 *
 * onSubmit gọi Route Handler /api/booking (Ngày 20) — Route Handler đó mới là nơi gọi WP REST
 * API tạo booking_request qua JWT server-side; component này chỉ fetch() tới route nội bộ,
 * không tự nói chuyện với WordPress.
 */
export function LienHePageClient({
  routeOptions,
  vehicleTypeOptions,
}: {
  routeOptions: string[];
  vehicleTypeOptions: string[];
}) {
  const [defaultRoute, setDefaultRoute] = useState("");
  // Ngày 21 — xem lib/zalo.ts. null khi chưa cấu hình NEXT_PUBLIC_ZALO_OA_ID → dòng dưới vẫn
  // hiển thị dạng chữ tĩnh như trước, không đổi thành link chết.
  const zaloLink = getZaloChatLink();

  // Đọc window.location (chỉ có ở client) để prefill sau mount; không dùng lazy initializer cho
  // useState vì sẽ lệch với HTML SSR ban đầu (hydration mismatch). Cùng pattern đã dùng ở
  // routes-page-client.tsx (Ngày 9).
  useEffect(() => {
    const tuyen = new URLSearchParams(window.location.search).get("tuyen");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tuyen) setDefaultRoute(tuyen);
  }, []);

  async function handleSubmit(data: BookingFormData) {
    const res = await fetchBookingWithIdempotency("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Gửi yêu cầu đặt xe thất bại (HTTP ${res.status}).`);
    }
  }

  return (
    <main className="site-shell">
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="/#booking"
      />

      <UnifiedHero eyebrow="LIÊN HỆ" title={<>Cùng lên kế hoạch<br /><em>cho chuyến đi.</em></>} description={`Để lại thông tin, ${SITE_NAME} sẽ tư vấn lịch trình và loại xe phù hợp.`} />

      <section className="section-wrap lien-he-content">
        <div className="lien-he-form-card">
          <h2>Gửi yêu cầu đặt xe</h2>
          <p>Điền thông tin bên dưới, chưa cần thanh toán trước.</p>
          <ContactBookingForm
            routeOptions={routeOptions}
            vehicleTypeOptions={vehicleTypeOptions}
            defaultRoute={defaultRoute}
            onSubmit={handleSubmit}
          />
        </div>

        <aside className="lien-he-info-card">
          <h3>Thông tin liên hệ</h3>
          <a className="lien-he-info-row" href={`tel:${SITE_HOTLINE_TEL}`}>
            <Phone /> {SITE_HOTLINE} (24/7)
          </a>
          <span className="lien-he-info-row">
            <MapPin /> {HO_CHI_MINH_PUBLIC_LABEL}
          </span>
          {zaloLink ? (
            <a className="lien-he-info-row" href={zaloLink} target="_blank" rel="noopener noreferrer">
              <Clock /> Tổng đài & Zalo hỗ trợ 24/7
            </a>
          ) : (
            <span className="lien-he-info-row">
              <Clock /> Tổng đài & Zalo hỗ trợ 24/7
            </span>
          )}
        </aside>
      </section>

      <SiteFooter
        tagline={
          <>
            Đi đâu cũng có {SITE_NAME}.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}`}
        madeFor="Made for the road."
        brandName={SITE_NAME}
      />
    </main>
  );
}
