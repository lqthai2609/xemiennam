import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { navItems } from "@/data/nav";
import type { Service } from "@/types/service";
import { ServiceCard } from "@/components/service-card";
import { SubpageHero, defaultSubpageHeroImage } from "@/components/subpage-hero";
import { buildRouteFinderProvinces } from "@/lib/route-finder";
import type { RouteFinderProvince } from "@/lib/route-finder";

export function ServicesPage({ services, finderProvinces }: { services: Service[]; finderProvinces: RouteFinderProvince[] }) {
  return <main className="site-shell services-page"><SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Thuê xe ngay" ctaHref="/#booking" /><SubpageHero title="Một chuyến đi đúng nhu cầu." description="Không chỉ là một chiếc xe. Là cách di chuyển được thiết kế vừa vặn với ngày vui, lịch bay, công việc và những cuộc khám phá của bạn." backgroundImage={defaultSubpageHeroImage} provinces={finderProvinces} /><section className="services-grid section-wrap"><div className="section-heading"><div><p className="section-label">CHỌN ĐIỀU BẠN CẦN</p><h2>Dịch vụ dành riêng<br />cho hành trình của bạn.</h2></div><p className="section-intro">Từ một chuyến đón sân bay đến những ngày cần xe dài hạn, chúng tôi luôn bắt đầu bằng nhu cầu thật.</p></div><div className="service-card-grid">{services.map((service) => <ServiceCard key={service.slug} service={service} />)}</div></section><SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={[{ title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Dịch vụ", href: "/dich-vu" }] }, { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." /></main>;
}
