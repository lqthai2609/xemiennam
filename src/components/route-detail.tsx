import Link from "next/link";
import { ArrowRight, Check, Clock3, MapPin, Milestone, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, type NavItem } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import type { RouteDetail } from "@/data/route-details";

const navItems: NavItem[] = [
  { label: "Tuyến đường", href: "/tuyen-duong" },
  { label: "Đội xe", href: "/#fleet" },
  { label: "Loại xe", href: "/#fleet" },
  { label: "Dịch vụ", href: "#" },
  { label: "Khuyến mãi", href: "#" },
  { label: "Blog", href: "/#blog" },
  { label: "Đánh giá", href: "/#stories" },
  { label: "Liên hệ", href: "#" },
];

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Đội xe", href: "/#fleet" }, { label: "Cẩm nang đi đường", href: "/#blog" }] },
  { title: "HỖ TRỢ", links: [{ label: "Tra cứu vé", href: "#" }, { label: "Chính sách hoàn vé", href: "#" }, { label: "Liên hệ", href: "/#booking" }] },
];

function DetailCard({ route }: { route: RouteDetail }) {
  return (
    <Link className="route-ticket related-ticket" href={`/tuyen-duong/${route.slug}`}>
      <div className="rt-price"><span>Giá từ</span><b>{route.price}</b></div>
      <div className="rt-body"><div className="rt-route"><span>{route.from}</span><ArrowRight size={16} /><span>{route.to}</span></div><div className="rt-meta"><span><Clock3 size={13} /> {route.time}</span><span><Milestone size={13} /> {route.distance}</span></div></div>
      <div className="rt-cta">Xem tuyến <ArrowRight size={14} /></div>
    </Link>
  );
}

export function RouteDetailPage({ route, relatedRoutes }: { route: RouteDetail; relatedRoutes: RouteDetail[] }) {
  return (
    <main className="site-shell route-detail-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="#booking" />
      <section className="route-detail-hero">
        <div className="route-detail-hero-copy">
          <Link className="back-link" href="/tuyen-duong"><ArrowRight size={15} className="back-arrow" /> Tất cả tuyến đường</Link>
          <p className="eyebrow"><span className="eyebrow-line" /> {route.heroNote}</p>
          <h1>{route.from}<br /><em>→ {route.to}</em></h1>
          <p className="detail-summary">{route.summary}</p>
          <div className="detail-meta"><span><Clock3 size={16} /> {route.time}</span><span><Milestone size={16} /> {route.distance}</span><span><ShieldCheck size={16} /> Đúng giờ, an tâm</span></div>
        </div>
        <div className="route-detail-sign" aria-label={`Tuyến ${route.from} đến ${route.to}`}><span>XE MIỀN NAM</span><strong>{route.from}</strong><ArrowRight size={30} /><strong>{route.to}</strong><small>ĐI TỬ TẾ TRÊN MỌI CUNG ĐƯỜNG</small></div>
      </section>

      <section className="detail-content section-wrap">
        <div className="detail-main">
          <div className="section-heading detail-heading"><div><p className="section-label">GIÁ VÉ THAM KHẢO</p><h2>Chọn cách bạn muốn đi.</h2></div><p className="heading-note">Giá đã gồm phí cầu đường.<br />Không có phụ phí ẩn.</p></div>
          <div className="detail-price-grid">{route.vehicleTypes.map((vehicle, index) => <article className="detail-price-card" key={vehicle}><span className="vehicle-chip">{vehicle}</span><strong>{index === 0 ? route.price : index === 1 ? "260K" : index === 2 ? "420K" : "520K"}</strong><small>/ người · một chiều</small><Link href="#booking">Đặt chỗ <ArrowRight size={14} /></Link></article>)}</div>

          <div className="detail-stops"><div className="section-heading detail-heading"><div><p className="section-label">ĐIỂM ĐÓN & TRẢ</p><h2>Điểm nào cũng gần bạn.</h2></div></div><div className="stops-grid"><div><span className="stop-kicker"><MapPin size={15} /> Điểm đón tại {route.from}</span><ul>{route.pickup.map((stop) => <li key={stop}><span className="stop-dot" />{stop}</li>)}</ul></div><div><span className="stop-kicker"><MapPin size={15} /> Điểm trả tại {route.to}</span><ul>{route.dropoff.map((stop) => <li key={stop}><span className="stop-dot destination" />{stop}</li>)}</ul></div></div></div>

          <div className="detail-map-wrap"><div className="section-heading detail-heading"><div><p className="section-label">CUNG ĐƯỜNG</p><h2>Thấy trước hành trình.</h2></div></div><iframe className="detail-map" src={route.mapUrl} title={`Bản đồ tuyến ${route.from} đến ${route.to}`} loading="lazy" /></div>
        </div>
        <aside className="detail-aside" id="booking"><div className="booking-card"><p className="section-label">ĐẶT CHUYẾN</p><h2>Sẵn sàng lên đường?</h2><p>Để lại thông tin, đội ngũ Xe Miền Nam sẽ gọi lại xác nhận trong ít phút.</p><Button size="lg" asChild><a href="tel:19006789">Gọi 1900 6789 <Phone data-icon="inline-end" /></a></Button><span className="booking-note"><ShieldCheck size={16} /> Không cần thanh toán trước</span></div><div className="departures-card"><p className="section-label">GIỜ KHỞI HÀNH GỢI Ý</p><div className="departure-list">{route.departures.map((time) => <span key={time}>{time}</span>)}</div><ul className="detail-notes">{route.notes.map((note) => <li key={note}><Check size={15} />{note}</li>)}</ul></div></aside>
      </section>

      <section className="related-section section-wrap"><div className="section-heading"><div><p className="section-label">CÓ THỂ BẠN QUAN TÂM</p><h2>Thêm một cung đường.</h2></div><Link className="text-link" href="/tuyen-duong">Xem tất cả tuyến <ArrowRight size={17} /></Link></div><div className="route-list related-list">{relatedRoutes.map((related) => <DetailCard route={related} key={related.id} />)}</div></section>
      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}
