import type { Metadata } from "next";
import { ZaloIcon } from "@/components/zalo-icon";
import { Suspense } from "react";
import { ArrowRight, CalendarDays, CarFront, ClipboardCheck, Phone, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HomeFeaturedRoutes, HomeFeaturedDestinations, HomeFeaturedBlog } from "@/components/home-dynamic-sections";
import { HomeFleet } from "@/components/home-fleet";
import { RouteFinderForm } from "@/components/route-finder-form";
import { fetchRoutes } from "@/lib/api/routes";
import { getZaloChatLink } from "@/lib/zalo";
import { navItems } from "@/data/nav";
import { JsonLd } from "@/components/json-ld";
import { buildLocalBusinessSchema } from "@/lib/schema";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_DESCRIPTION, SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import "./home-redesign.css";

export const metadata: Metadata = buildPageMetadata({
  title: `${SITE_NAME} — Xe riêng có tài xế cho hành trình của bạn`,
  description: SITE_DESCRIPTION,
  path: "/",
});

async function HeroBooking() {
  const routes = await fetchRoutes();
  return <RouteFinderForm id="booking" routes={routes} variant="hero" />;
}

const steps = [
  { icon: Search, title: "Chọn tuyến", detail: "Tìm tuyến phù hợp với nhu cầu của bạn." },
  { icon: CarFront, title: "Chọn xe", detail: "Chọn loại xe phù hợp với số lượng hành khách." },
  { icon: CalendarDays, title: "Xác nhận lịch và giá", detail: "Kiểm tra thông tin và xác nhận đặt xe." },
];

export default function Home() {
  const zaloLink = getZaloChatLink();

  return (
    <main className="site-shell home-redesign">
      <JsonLd data={buildLocalBusinessSchema()} />
      <SiteHeader menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Blog", "Liên hệ"].includes(item.label))} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink || "/lien-he"} homeDesign />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-inner">
          <p className="home-eyebrow">ALO ĐẶT XE</p>
          <h1 id="home-title">Xe riêng có tài xế<br />cho hành trình của bạn</h1>
          <p className="home-hero-lede">Chọn tuyến, xem giá và chủ động lịch đón cùng Alo Đặt Xe.</p>
          <div className="home-hero-actions">
            <a className="home-button home-button-primary" href="#booking">Xem tuyến và giá <ArrowRight size={18} /></a>
            {zaloLink && <a className="home-button home-button-outline zalo-cta" href={zaloLink} target="_blank" rel="noopener noreferrer"><ZaloIcon /> Nhắn Zalo tư vấn</a>}
          </div>
        </div>
      </section>

      <div className="home-booking-wrap">
        <Suspense fallback={<div className="home-booking-skeleton" aria-label="Đang tải công cụ tìm chuyến" />}>
          <HeroBooking />
        </Suspense>
        <section className="home-benefits" aria-label="Lợi ích của dịch vụ">
          <div><span><CarFront /></span><p><strong>Xe riêng có tài xế</strong><small>Chủ động, thoải mái cho hành trình của bạn.</small></p></div>
          <div><span><CalendarDays /></span><p><strong>Chọn lịch đón</strong><small>Linh hoạt thời gian theo kế hoạch.</small></p></div>
          <div><span><ClipboardCheck /></span><p><strong>Xác nhận giá trước chuyến đi</strong><small>Biết rõ chi phí, yên tâm đặt xe.</small></p></div>
        </section>
      </div>

      <Suspense fallback={<div className="home-content-skeleton" aria-hidden="true" />}>
        <HomeFeaturedRoutes />
      </Suspense>

      <HomeFleet />

      <Suspense fallback={null}><HomeFeaturedDestinations /></Suspense>

      <section className="home-steps home-container" aria-labelledby="home-steps-title">
        <h2 id="home-steps-title">Các bước đặt xe đơn giản</h2>
        <div className="home-steps-grid">
          {steps.map(({ icon: Icon, title, detail }, index) => (
            <div className="home-step" key={title}><span className="home-step-number">{index + 1}</span><Icon aria-hidden="true" /><div><strong>{title}</strong><p>{detail}</p></div></div>
          ))}
        </div>
      </section>

      <Suspense fallback={null}><HomeFeaturedBlog /></Suspense>

      <section className="home-contact home-container" aria-labelledby="home-contact-title">
        <div><h2 id="home-contact-title">Chưa tìm thấy chuyến phù hợp?</h2><p>Liên hệ ngay để được tư vấn tuyến đường phù hợp nhất.</p></div>
        <div className="home-contact-actions">
          {zaloLink && <a className="home-button home-button-primary zalo-cta" href={zaloLink} target="_blank" rel="noopener noreferrer"><ZaloIcon /> Nhắn Zalo tư vấn <ArrowRight size={18} /></a>}
          <a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={18} /> Gọi {SITE_HOTLINE}</a>
        </div>
      </section>

      <SiteFooter
        tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng di chuyển từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>}
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={[
          { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Điểm đến", href: "/diem-den" }, { label: "Loại xe", href: "/loai-xe" }, { label: "Blog", href: "/blog" }] },
          { title: "HỖ TRỢ", links: [{ label: "Liên hệ", href: "/lien-he" }] },
        ]}
        socialLinks={[]}
        copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`}
        madeFor="Đồng hành cùng bạn trên mọi hành trình."
        brandMark="A"
        brandName={SITE_NAME}
      />
    </main>
  );
}
