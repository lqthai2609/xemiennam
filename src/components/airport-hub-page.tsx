import Link from "next/link";
import { ArrowDown, ArrowRight, CheckCircle2, MapPin, MessageCircle, Phone, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { buildFaqPageSchema } from "@/lib/schema";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME, SITE_CONTACT_PHONE_TEL } from "@/lib/site-config";
import type { AirportHubData, AirportHubRoute } from "@/lib/api/airport-routes";

const faqs = [
  { question: "Có xe từ sân bay Tân Sơn Nhất đi các tỉnh không?", answer: "Gocar VN cung cấp xe riêng có tài xế cho các hành trình từ Tân Sơn Nhất đến các địa phương đang có tuyến trong hệ thống." },
  { question: "Có thể đặt chiều từ tỉnh lên sân bay Tân Sơn Nhất không?", answer: "Có. Các tuyến hỗ trợ chiều đến sân bay được hiển thị trong mục Đến Tân Sơn Nhất." },
  { question: "Nếu tuyến chưa có giá thì sao?", answer: "Các tuyến chưa có mức giá cố định sẽ hiển thị Liên hệ báo giá. Khách có thể gửi hành trình để được tư vấn." },
  { question: "Tôi đi nhiều hành lý nên chọn xe nào?", answer: "Nên chọn loại xe dựa trên số người và lượng hành lý. Bạn có thể liên hệ Gocar VN để được tư vấn loại xe phù hợp." },
];

function RouteCard({ item }: { item: AirportHubRoute }) {
  const distance = item.route.distance;
  const time = item.route.time;
  return (
    <article className="airport-route-card">
      <div className="airport-route-path">
        <div><span className="airport-route-label">Điểm đi</span><strong>{item.from}</strong></div>
        <ArrowDown aria-hidden="true" className="airport-route-arrow" />
        <div><span className="airport-route-label">Điểm đến</span><strong>{item.to}</strong></div>
      </div>
      <div className="airport-route-meta">
        {distance ? <span><MapPin aria-hidden="true" /> {distance}</span> : null}
        {time ? <span><CheckCircle2 aria-hidden="true" /> {time}</span> : null}
      </div>
      <div className="airport-route-footer">
        <div><span>{item.featuredPrice ? "Giá từ" : "Báo giá"}</span><strong>{item.priceLabel}</strong></div>
        <Button asChild><Link href={item.href}>Xem tuyến <ArrowRight data-icon="inline-end" /></Link></Button>
      </div>
    </article>
  );
}

function RouteList({ routes }: { routes: AirportHubRoute[] }) {
  if (routes.length === 0) {
    return <div className="airport-empty"><MapPin aria-hidden="true" /><h3>Chưa có tuyến ở chiều này</h3><p>Gọi hoặc nhắn Zalo để Gocar VN tư vấn hành trình phù hợp với nhu cầu của bạn.</p></div>;
  }
  return <div className="airport-route-grid">{routes.map((item) => <RouteCard key={`${item.route.slug}-${item.travelDirection}`} item={item} />)}</div>;
}

export function AirportHubPage({ data }: { data: AirportHubData }) {
  const airportName = data.airport.name;
  const allProvinceLinks = data.routes.filter((item) => item.counterpart?.provinceSlug).map((item) => item.counterpart!).filter((location, index, list) => list.findIndex((item) => item.slug === location.slug) === index);
  return (
    <main className="site-shell airport-hub-page">
      <JsonLd data={buildFaqPageSchema(faqs)} />
      <SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Đặt xe ngay" ctaHref="/#booking" />
      <div className="airport-container">
        <nav className="airport-breadcrumb" aria-label="Đường dẫn trang"><Link href="/">Trang chủ</Link><ArrowRight aria-hidden="true" /><Link href="/dich-vu/dua-don-san-bay">Đưa đón sân bay</Link><ArrowRight aria-hidden="true" /><span aria-current="page">{airportName}</span></nav>
        <section className="airport-hero">
          <div className="airport-hero-copy"><p className="airport-eyebrow"><PlaneLanding aria-hidden="true" /> Dịch vụ đưa đón sân bay</p><h1>Xe đưa đón sân bay {airportName} ↔ các tỉnh thành</h1><p className="airport-hero-lede">Xe riêng có tài xế, hỗ trợ hành lý, phù hợp khách cá nhân, gia đình và nhóm công tác. Chọn tuyến liên tỉnh hai chiều và nhận báo giá rõ ràng từ {SITE_NAME}.</p><div className="airport-actions"><Button size="lg" asChild><a href="#airport-routes">Xem tuyến <ArrowRight data-icon="inline-end" /></a></Button><Button size="lg" variant="outline" asChild><a href={`tel:${SITE_HOTLINE_TEL}`}><Phone data-icon="inline-start" /> Gọi ngay</a></Button><Button size="lg" variant="ghost" asChild><a href={`https://zalo.me/${SITE_CONTACT_PHONE_TEL.replace("+", "")}`}><MessageCircle data-icon="inline-start" /> Zalo</a></Button></div></div><div className="airport-hero-panel"><PlaneTakeoff aria-hidden="true" /><span>Hành trình chủ động</span><strong>{data.routes.length} tuyến đang mở</strong><p>Đặt xe theo nhu cầu, không ghép khách.</p></div>
        </section>
        <section className="airport-routes-section" id="airport-routes"><div className="airport-section-heading"><div><p className="airport-eyebrow">Danh sách tuyến</p><h2>Chọn chiều hành trình</h2></div><p>Giá và thông tin tuyến được cập nhật theo dữ liệu hiện có của Gocar VN.</p></div><div className="airport-tabs" role="tablist" aria-label="Chọn chiều hành trình"><a className="airport-tab is-active" href="#from-airport" role="tab" aria-selected="true"><PlaneTakeoff aria-hidden="true" /> Từ {airportName}<span>{data.fromAirport.length}</span></a><a className="airport-tab" href="#to-airport" role="tab" aria-selected="false"><PlaneLanding aria-hidden="true" /> Đến {airportName}<span>{data.toAirport.length}</span></a></div><div id="from-airport" className="airport-direction-block"><h3>Từ {airportName} đi tỉnh</h3><RouteList routes={data.fromAirport} /></div><div id="to-airport" className="airport-direction-block"><h3>Từ tỉnh đến {airportName}</h3><RouteList routes={data.toAirport} /></div></section>
        <section className="airport-service-callout"><div><p className="airport-eyebrow">Dịch vụ Gocar VN</p><h2>Đưa đón sân bay nhẹ nhàng, đúng nhu cầu</h2><p>Xe có tài xế, hỗ trợ hành lý và linh hoạt cho cá nhân, gia đình hoặc nhóm công tác.</p></div><Button variant="outline" asChild><Link href="/dich-vu/dua-don-san-bay">Tìm hiểu dịch vụ <ArrowRight data-icon="inline-end" /></Link></Button></section>
        {allProvinceLinks.length > 0 ? <section className="airport-province-links"><h2>Khám phá điểm đến</h2><div>{allProvinceLinks.map((location) => <Link key={location.slug} href={`/tinh/${location.provinceSlug}`}>{location.name}<ArrowRight aria-hidden="true" /></Link>)}</div></section> : null}
        <section className="airport-faq"><p className="airport-eyebrow">Câu hỏi thường gặp</p><h2>Giải đáp nhanh về xe sân bay</h2><div>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
        <section className="airport-contact-banner"><div><p className="airport-eyebrow">Cần tư vấn riêng?</p><h2>Gửi hành trình, Gocar VN báo giá</h2><p>Gọi {SITE_HOTLINE} hoặc nhắn Zalo để được hỗ trợ chọn xe và tuyến phù hợp.</p></div><div className="airport-actions"><Button asChild><a href={`tel:${SITE_HOTLINE_TEL}`}><Phone data-icon="inline-start" /> Gọi {SITE_HOTLINE}</a></Button><Button variant="secondary" asChild><a href={`https://zalo.me/${SITE_CONTACT_PHONE_TEL.replace("+", "")}`}><MessageCircle data-icon="inline-start" /> Nhắn Zalo</a></Button></div></section>
      </div>
      <SiteFooter tagline="Những chuyến xe tử tế cho hành trình đáng nhớ." phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Dịch vụ", href: "/dich-vu/dua-don-san-bay" }] }, { title: "HỖ TRỢ", links: [{ label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={defaultSocialLinks} copyright="© Gocar VN" madeFor="Đồng hành mọi hành trình" />
    </main>
  );
}

export { faqs };
export type { AirportHubData };

