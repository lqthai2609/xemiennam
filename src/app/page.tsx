import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight, Clock3, Headphones, Ticket, ShieldCheck, Users, BusFront } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { FleetShowcase } from "@/components/fleet-showcase";
import { fetchRoutes } from "@/lib/api/routes";
import { RouteFinderForm } from "@/components/route-finder-form";
import { HomeDynamicSections } from "@/components/home-dynamic-sections";
import { navItems } from "@/data/nav";
import { JsonLd } from "@/components/json-ld";
import { buildLocalBusinessSchema } from "@/lib/schema";
import { SITE_DESCRIPTION } from "@/lib/site-config";

/** Ngày 23 — trang chủ trước đây không khai báo metadata riêng, chỉ ăn theo layout.tsx gốc. */
export const metadata: Metadata = {
  title: "Xe Miền Nam — Thuê xe nguyên chiếc 4–45 chỗ và Limousine",
  description: SITE_DESCRIPTION,
};

/**
 * KHÔI PHỤC Ngày 12: commit "ngay 11" trên GitHub đã vô tình ghi đè toàn bộ trang chủ
 * bằng nội dung của /doi-xe (giống hệt FleetPage). Bản dưới đây phục hồi đúng trang chủ
 * (commit "Build vehicle fleet listing and detail pages", trước khi bị ghi đè) và chuyển
 * sang Server Component để fetchRoutes() (WP REST API thật) chạy được ISR — trang chủ vốn
 * là "use client" nên không thể fetch có revalidate ở đây; phần tương tác duy nhất (tab lọc
 * đội xe) đã tách riêng sang <FleetShowcase /> (client component, không cần dữ liệu fetch).
 */

const stats = [
  { value: "15+", label: "tuyến cố định miền Nam" },
  { value: "4–45", label: "chỗ, đủ loại xe" },
  { value: "24/7", label: "tổng đài & Zalo hỗ trợ" },
  { value: "0đ", label: "phụ phí phát sinh" },
];

const homeUsps = [
  { icon: Clock3, title: "Đón đúng giờ", description: "Lịch trình rõ ràng, chủ động trong từng chuyến đi." },
  { icon: ShieldCheck, title: "Giá luôn minh bạch", description: "Báo giá trọn gói, không thêm chi phí bất ngờ." },
  { icon: BusFront, title: "Xe phù hợp mọi đoàn", description: "Đa dạng xe từ 4 đến 45 chỗ, sạch sẽ và tiện nghi." },
  { icon: Headphones, title: "Hỗ trợ 24/7", description: "Luôn sẵn sàng đồng hành trước, trong và sau chuyến đi." },
];

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Cẩm nang đi đường", href: "/blog" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Chính sách huỷ chuyến", href: "#" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

/** Tách dữ liệu tuyến khỏi shell để HTML hero được stream ngay, không chờ WordPress. */
async function HeroBooking() {
  const routes = await fetchRoutes();
  return <RouteFinderForm id="booking" routes={routes} variant="hero" />;
}

export default function Home() {
  return (
    <main className="site-shell">
      <JsonLd data={buildLocalBusinessSchema()} />
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="hero" id="top">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" /> Đi đâu cũng có Xe Miền Nam
            </div>
            <h1>
              Đi xa hơn.
              <br />
              <em>Vui hơn.</em>
            </h1>
            <p>Từ thành phố đến biển xanh, từ miền Tây đến cao nguyên. Những chuyến xe tử tế cho hành trình đáng nhớ.</p>
            <div className="hero-actions">
              <Button size="lg" asChild>
                <a href="#booking">
                  Tìm chuyến xe <ArrowRight data-icon="inline-end" />
                </a>
              </Button>
              <Link className="text-link" href="/tuyen-duong">
                Xem các tuyến đường <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-trust">
              <div className="avatar-stack">
                <span>H</span>
                <span>M</span>
                <span>T</span>
              </div>
              <span>
                <strong>4.9/5</strong> từ hơn 2.000 hành khách
              </span>
            </div>
          </div>
          <div className="hero-booking">
            <Suspense fallback={<div className="hero-booking-skeleton" aria-label="Đang tải công cụ tìm tuyến" />}>
              <HeroBooking />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="home-usp-section" aria-label="Lợi ích khi chọn Xe Miền Nam">
        <div className="home-usp-grid">
          {homeUsps.map(({ icon: Icon, title, description }) => (
            <article className="home-usp-card" key={title}>
              <span className="home-usp-icon"><Icon size={22} /></span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Suspense fallback={<div className="home-sections-skeleton" aria-hidden="true" />}>
        <HomeDynamicSections />
      </Suspense>

      {/* Nội dung tĩnh phía dưới không phụ thuộc CMS nên vẫn được stream ngay lập tức. */}
      <FleetShowcase />

      <section className="stats-section">
        <div className="stats-band">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="promise-section" id="about">
        <div className="promise-art">
          <div className="ticket-big">
            <Ticket size={29} />
            <span>THUÊ TRỌN CHUYẾN</span>
            <strong>ĐI TỬ TẾ</strong>
            <small>XE MIỀN NAM · 2012—2024</small>
          </div>
        </div>
        <div className="promise-copy">
          <SectionLabel>ĐIỀU CHÚNG TÔI TIN</SectionLabel>
          <h2>Không chỉ là một chuyến xe.</h2>
          <p>Chúng tôi tin mỗi hành trình đều có thể bắt đầu bằng một nụ cười, một tài xế tử tế và chiếc xe luôn đúng giờ.</p>
          <ul>
            <li>
              <ShieldCheck size={20} />
              <span>
                <strong>An toàn là ưu tiên</strong>
                <br />
                Bảo dưỡng định kỳ, tài xế tận tâm.
              </span>
            </li>
            <li>
              <Users size={20} />
              <span>
                <strong>Phục vụ như người nhà</strong>
                <br />
                Luôn lắng nghe và hỗ trợ bạn.
              </span>
            </li>
          </ul>
          <a className="text-link" href="#stories">
            Câu chuyện của chúng tôi <ArrowRight size={17} />
          </a>
        </div>
      </section>



      <section className="final-cta">
        <div>
          <SectionLabel>SẴN SÀNG LÊN ĐƯỜNG?</SectionLabel>
          <h2>
            Hành trình của bạn,
            <br />
            <em>chúng tôi lo.</em>
          </h2>
        </div>
        <div>
          <p>
            Đặt chuyến nhanh chóng, rõ ràng
            <br />
            và không có phí ẩn.
          </p>
          <Button size="lg">
            Bắt đầu đặt xe <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
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
