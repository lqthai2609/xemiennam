"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { ContactBookingForm, type BookingFormData } from "@/components/contact-booking-form";
import { navItems } from "@/data/nav";

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Đội xe", href: "/doi-xe" },
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
 * onSubmit hiện là placeholder — nối Route Handler /api/booking (gọi WP REST API tạo
 * booking_request qua JWT server-side) là việc của Ngày 20. Không tự viết logic gọi API ở đây.
 */
export function LienHePageClient({
  routeOptions,
  vehicleTypeOptions,
}: {
  routeOptions: string[];
  vehicleTypeOptions: string[];
}) {
  const [defaultRoute, setDefaultRoute] = useState("");

  // Đọc window.location (chỉ có ở client) để prefill sau mount; không dùng lazy initializer cho
  // useState vì sẽ lệch với HTML SSR ban đầu (hydration mismatch). Cùng pattern đã dùng ở
  // routes-page-client.tsx (Ngày 9).
  useEffect(() => {
    const tuyen = new URLSearchParams(window.location.search).get("tuyen");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tuyen) setDefaultRoute(tuyen);
  }, []);

  async function handleSubmit(data: BookingFormData) {
    // TODO (Ngày 20): thay đoạn dưới bằng fetch("/api/booking", { method: "POST", body: JSON.stringify(data) })
    // sau khi Route Handler /api/booking (JWT server-side → WP REST tạo booking_request) hoàn thành.
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log("[lien-he] Yêu cầu đặt xe (chưa nối API thật):", data);
  }

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="lien-he-hero">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> LIÊN HỆ
          </p>
          <h1>
            Sẵn sàng
            <br />
            <em>lên đường?</em>
          </h1>
          <p>
            Để lại thông tin, đội ngũ Xe Miền Nam sẽ gọi lại xác nhận trong ít phút. Cần gấp?
            Gọi hotline hoặc nhắn Zalo, có người trực 24/7.
          </p>
        </div>
      </section>

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
          <a className="lien-he-info-row" href="tel:19006789">
            <Phone /> 1900 6789 (24/7)
          </a>
          <span className="lien-he-info-row">
            <MapPin /> TP. Hồ Chí Minh
          </span>
          <span className="lien-he-info-row">
            <Clock /> Tổng đài & Zalo hỗ trợ 24/7
          </span>
        </aside>
      </section>

      <SiteFooter
        tagline={
          <>
            Đi đâu cũng có Xe Miền Nam.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
        phone="1900 6789"
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright="© 2026 Xe Miền Nam"
        madeFor="Made for the road."
      />
    </main>
  );
}
