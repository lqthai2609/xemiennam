"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ClipboardPenLine, Headphones, Phone, ShieldCheck, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { ContactBookingForm, type BookingFormData } from "@/components/contact-booking-form";
import { navItems } from "@/data/nav";
import { getZaloChatLink } from "@/lib/zalo";
import { ZaloIcon } from "@/components/zalo-icon";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { fetchBookingWithIdempotency } from "@/lib/booking-submit";
import { readCreatedLead } from "@/lib/lead-response";

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
      { label: "Câu hỏi thường gặp", href: "#contact-faq-title" },
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
    return readCreatedLead(res);
  }

  return (
    <main className="site-shell home-redesign contact-redesign">
      <SiteHeader
        menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Bảng giá", "Dịch vụ", "Liên hệ"].includes(item.label))}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Nhắn Zalo"
        ctaHref={zaloLink}
        homeDesign
      />

      <section className="contact-hero" aria-labelledby="contact-title">
        <div className="contact-hero-inner">
          <p className="home-eyebrow">LIÊN HỆ ALO ĐẶT XE</p>
          <h1 id="contact-title">Cùng lên kế hoạch<br />cho chuyến đi</h1>
          <p>Nhắn Zalo, gọi điện hoặc gửi yêu cầu để được tư vấn tuyến và loại xe phù hợp.</p>
          <div className="contact-hero-actions">
            <a className="home-button home-button-primary zalo-cta" href={zaloLink} target="_blank" rel="noopener noreferrer"><ZaloIcon />Nhắn Zalo ngay <ArrowRight size={18} aria-hidden="true" /></a>
            <a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={20} aria-hidden="true" />Gọi {SITE_HOTLINE}</a>
          </div>
        </div>
      </section>

      <section className="contact-benefits" aria-label="Lợi ích dịch vụ">
        <div><span><UsersRound aria-hidden="true" /></span><p><strong>Xe riêng có tài xế</strong><small>Thoải mái, an toàn, phù hợp cho cá nhân, gia đình, nhóm và doanh nghiệp.</small></p></div>
        <div><span><CalendarDays aria-hidden="true" /></span><p><strong>Chủ động điểm đón trả</strong><small>Linh hoạt thời gian, đón trả tận nơi theo lịch trình của bạn.</small></p></div>
        <div><span><ShieldCheck aria-hidden="true" /></span><p><strong>Xác nhận giá trước chuyến</strong><small>Minh bạch, rõ ràng; giá được xác nhận trước khi sắp xếp xe.</small></p></div>
      </section>

      <section className="contact-content" aria-label="Gửi yêu cầu và liên hệ tư vấn">
        <div className="lien-he-form-card">
          <div className="contact-form-intro"><span><ClipboardPenLine aria-hidden="true" /></span><div><h2>Gửi yêu cầu đặt xe</h2><p>Điền thông tin chuyến đi; Alo Đặt Xe sẽ liên hệ xác nhận trước khi sắp xếp xe.</p></div></div>
          <ContactBookingForm
            routeOptions={routeOptions}
            vehicleTypeOptions={vehicleTypeOptions}
            defaultRoute={defaultRoute}
            onSubmit={handleSubmit}
          />
        </div>

        <aside className="contact-sidebar">
          <div className="contact-side-zalo"><div className="contact-side-heading"><span><ZaloIcon /></span><div><h3>Muốn trao đổi nhanh?</h3><p>Nhắn Zalo để được tư vấn tuyến, loại xe và lịch trình phù hợp nhất.</p></div></div><a className="home-button home-button-primary zalo-cta" href={zaloLink} target="_blank" rel="noopener noreferrer"><ZaloIcon />Nhắn Zalo ngay <ArrowRight size={17} aria-hidden="true" /></a><a className="home-button home-button-outline contact-mobile-call" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={18} aria-hidden="true" />Gọi {SITE_HOTLINE}</a></div>
          <div className="contact-side-phone"><div className="contact-side-heading"><span><Phone aria-hidden="true" /></span><div><h3>Gọi <b>{SITE_HOTLINE}</b></h3><p>Tư vấn qua điện thoại hoặc Zalo.</p></div></div><a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={18} aria-hidden="true" />Gọi ngay {SITE_HOTLINE}</a></div>
          <div className="contact-steps"><h3>Cách đặt xe tại Alo Đặt Xe</h3><ol><li><b>1</b><span><strong>Gửi thông tin</strong><small>Điền biểu mẫu, nhắn Zalo hoặc gọi điện với thông tin chuyến đi của bạn.</small></span></li><li><b>2</b><span><strong>Nhận tư vấn và giá</strong><small>Chúng tôi tư vấn tuyến, loại xe phù hợp và xác nhận giá trước chuyến đi.</small></span></li><li><b>3</b><span><strong>Xác nhận chuyến</strong><small>Sau khi thống nhất thông tin, chúng tôi sẽ sắp xếp xe và tài xế theo lịch trình.</small></span></li></ol></div>
        </aside>
      </section>

      <section className="contact-faq" aria-labelledby="contact-faq-title"><h2 id="contact-faq-title"><span>?</span>Câu hỏi thường gặp</h2><div><details><summary>1. Làm sao để chọn tuyến và loại xe phù hợp?</summary><p>Bạn có thể chọn tuyến và loại xe trong biểu mẫu, hoặc nhắn Zalo để chúng tôi tư vấn theo số người và lịch trình.</p></details><details><summary>2. Giá có được xác nhận trước chuyến đi không?</summary><p>Có. Chúng tôi trao đổi thông tin hành trình và xác nhận giá trước khi bạn quyết định đặt xe.</p></details><details><summary>3. Tôi có thể thay đổi điểm đón sau khi đã gửi yêu cầu không?</summary><p>Bạn có thể báo lại điểm đón trước khi xác nhận chuyến. Chúng tôi sẽ kiểm tra và cập nhật thông tin, giá nếu hành trình thay đổi.</p></details></div></section>

      <section className="contact-bottom-cta" aria-label="Liên hệ hỗ trợ ngay"><span><Headphones aria-hidden="true" /></span><div><h2>Bạn cần hỗ trợ ngay?</h2><p>Liên hệ qua Zalo hoặc gọi {SITE_HOTLINE} để được tư vấn nhanh nhất.</p></div><div className="contact-bottom-actions"><a className="home-button home-button-primary zalo-cta" href={zaloLink} target="_blank" rel="noopener noreferrer"><ZaloIcon />Nhắn Zalo ngay</a><a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={18} aria-hidden="true" />Gọi {SITE_HOTLINE}</a></div></section>

      <SiteFooter
        tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>}
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`}
        madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật"
        brandName={SITE_NAME}
      />
    </main>
  );
}
