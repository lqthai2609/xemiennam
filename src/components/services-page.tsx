import Link from "next/link";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { navItems } from "@/data/nav";
import type { Service } from "@/types/service";
import { ServiceCard } from "@/components/service-card";
import { SubpageHero, defaultSubpageHeroImage } from "@/components/subpage-hero";
import type { Route } from "@/types/route";
import { SITE_CONTACT_PHONE_DISPLAY, SITE_HOTLINE, SITE_NAME } from "@/lib/site-config";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Dịch vụ", href: "/dich-vu" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

export function ServicesPage({ services, routes }: { services: Service[]; routes: Route[] }) {
  return (
    <main className="site-shell services-page">
      <SiteHeader menuItems={navItems} hotline={SITE_CONTACT_PHONE_DISPLAY} ctaLabel="Thuê xe ngay" ctaHref="/#booking" />
      <SubpageHero
        title="Một chuyến đi đúng nhu cầu."
        description="Không chỉ là một chiếc xe. Là cách di chuyển được thiết kế vừa vặn với ngày vui, lịch bay, công việc và những cuộc khám phá của bạn."
        backgroundImage={defaultSubpageHeroImage}
        routes={routes}
      />
      <section className="services-grid section-wrap">
        <div className="section-heading">
          <div>
            <p className="section-label">CHỌN ĐIỀU BẠN CẦN</p>
            <h2>Dịch vụ dành riêng<br />cho hành trình của bạn.</h2>
          </div>
          <p className="section-intro">Từ một chuyến đón sân bay đến những ngày cần xe dài hạn, chúng tôi luôn bắt đầu bằng nhu cầu thật.</p>
        </div>
        {services.length > 0 ? (
          <div className="service-card-grid">
            {services.map((service) => <ServiceCard key={service.slug} service={service} />)}
          </div>
        ) : (
          <div className="route-empty" role="status">
            <h2>Hiện chưa có dịch vụ được công bố</h2>
            <p>Gocar VN vẫn nhận tư vấn hành trình và nhu cầu thuê xe trực tiếp.</p>
            <Link className="button button-primary" href="/lien-he">Liên hệ tư vấn</Link>
          </div>
        )}
      </section>
      <SiteFooter
        tagline={<>Đi đâu cũng có {SITE_NAME}.<br />Kết nối những hành trình tử tế.</>}
        phone={SITE_HOTLINE}
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}`}
        madeFor="Made for the road."
      />
    </main>
  );
}
