import Link from "next/link";
import { ArrowRight, CarFront, Check, Clock3, Luggage, MapPin, Milestone, Phone, ShieldCheck, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { MediaPhoto } from "@/components/media-photo";
import { expandVehiclePrices, routeComboHref, routeHref, vehicleTypeSlug, type Route, type VehiclePrice } from "@/types/route";
import { navItems } from "@/data/nav";
import { formatVNDate } from "@/lib/wp";
import { UnifiedHero } from "@/components/unified-hero";
import { BlogCard } from "@/components/blog-card";
import type { Testimonial } from "@/types/testimonial";
import type { BlogPost } from "@/types/blog";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Cẩm nang đi đường", href: "/blog" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Chính sách huỷ chuyến", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

function DetailCard({ route }: { route: Route }) {
  return (
    <Link className="route-ticket related-ticket" href={routeHref(route)}>
      <div className="rt-price"><span>Giá từ</span><b>{route.price}</b></div>
      <div className="rt-body"><div className="rt-route"><span>{route.from}</span><ArrowRight size={16} /><span>{route.to}</span></div><div className="rt-meta"><span><Clock3 size={13} /> {route.time}</span><span><Milestone size={13} /> {route.distance}</span></div></div>
      <div className="rt-cta">Xem tuyến <ArrowRight size={14} /></div>
    </Link>
  );
}

function VehicleRouteCard({ route, vehiclePrice, image }: { route: Route; vehiclePrice: VehiclePrice; image?: string }) {
  const routeLabel = `${route.from} – ${route.to}`;
  const seats = vehiclePrice.vehicleType === "Limousine" ? "8 khách" : `${vehiclePrice.vehicleType.replace(" chỗ", "")} khách`;
  const luggage = vehiclePrice.vehicleType === "45 chỗ" ? "12 vali" : vehiclePrice.vehicleType === "29 chỗ" ? "8 vali" : vehiclePrice.vehicleType === "16 chỗ" ? "5 vali" : "2 vali";
  return (
    <article className="route-vehicle-card">
      <div className="route-vehicle-media">
        {image ? <MediaPhoto src={image} alt={`Xe ${vehiclePrice.vehicleType} tuyến ${routeLabel}`} /> : <CarFront size={80} strokeWidth={1.15} />}
        <strong>Xe {vehiclePrice.vehicleType} <span>(VIP)</span></strong>
      </div>
      <div className="route-vehicle-info">
        <div className="route-vehicle-top">
          <div><h3>Xe {vehiclePrice.vehicleType} TaxiGo</h3><div className="combo-rating">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={15} fill={index < 4 ? "currentColor" : "none"} />)}<span>4.9 · (1,250)</span></div></div>
          <div className="route-vehicle-price"><span>Giá tham khảo</span><strong>{vehiclePrice.price}</strong></div>
        </div>
        <div className="route-vehicle-divider" />
        <div className="route-vehicle-specs"><span><CarFront size={17} /> Xe sạch, điều hoà, tài xế kinh nghiệm</span><span><Users size={17} /> {seats}</span><span><Luggage size={17} /> {luggage}</span></div>
        <div className="route-vehicle-footer"><div><p>Giá đã gồm phí cầu đường</p><small><Check size={14} /> Xác nhận xe trước khi khởi hành</small></div><Link className="route-vehicle-cta" href={routeComboHref(route, vehicleTypeSlug(vehiclePrice.vehicleType))}>Xem chi tiết <ArrowRight size={16} /></Link></div>
      </div>
    </article>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return <article className="combo-testimonial-card"><div className="combo-testimonial-stars">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={14} fill={index < testimonial.rating ? "currentColor" : "none"} />)}</div><p>{testimonial.quote}</p><div className="combo-testimonial-who"><span className="combo-testimonial-avatar">{testimonial.initials}</span><div><b>{testimonial.name}</b>{testimonial.date && <small>{formatVNDate(testimonial.date)}</small>}</div></div></article>;
}

export function RouteDetailPage({
  route,
  relatedRoutes,
  testimonials,
  relatedPosts,
  vehicleImageByType = {},
}: {
  route: Route;
  relatedRoutes: Route[];
  testimonials: Testimonial[];
  relatedPosts: BlogPost[];
  /** Ảnh đại diện theo loại xe (vehicle.images[0] của 1 xe thật thuộc đúng loại), để hiện lên
   * mỗi card giá — xem app/tuyen-duong/[tinh]/[tuyen]/page.tsx (nối fetchVehicles() thật). Rỗng
   * nếu loại xe đó chưa có xe nào nhập ảnh, card tự fallback về icon. */
  vehicleImageByType?: Record<string, string>;
}) {
  return (
    <main className="site-shell route-detail-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="#booking" />
      <UnifiedHero eyebrow={route.heroNote} title={<> {route.from}<br /><em>→ {route.to}</em></>} description={route.summary} backgroundImage="/images/services/city-tour.png" backHref={`/tuyen-duong/${route.regionSlug || "khac"}`} backLabel={`Tất cả tuyến ${route.region}`} /><section className="detail-content section-wrap">
        <div className="detail-main">
          <div className="section-heading detail-heading"><div><p className="section-label">GIÁ THUÊ XE THAM KHẢO</p><h2>Chọn cách bạn muốn đi.</h2></div><p className="heading-note">Giá đã gồm phí cầu đường.<br />Không có phụ phí ẩn.</p></div>
          <div className="detail-price-grid">
            {expandVehiclePrices(route.pricingByVehicle).map((vp) => <VehicleRouteCard key={vp.vehicleType} route={route} vehiclePrice={vp} image={vehicleImageByType[vp.vehicleType]} />)}
          </div>

          <div className="detail-stops"><div className="section-heading detail-heading"><div><p className="section-label">ĐIỂM ĐÓN & TRẢ</p><h2>Điểm nào cũng gần bạn.</h2></div></div><div className="stops-grid"><div><span className="stop-kicker"><MapPin size={15} /> Điểm đón tại {route.from}</span><ul>{route.pickupPoints.map((stop) => <li key={stop}><span className="stop-dot" />{stop}</li>)}</ul></div><div><span className="stop-kicker"><MapPin size={15} /> Điểm trả tại {route.to}</span><ul>{route.dropoffPoints.map((stop) => <li key={stop}><span className="stop-dot destination" />{stop}</li>)}</ul></div></div></div>

          <div className="detail-map-wrap"><div className="section-heading detail-heading"><div><p className="section-label">CUNG ĐƯỜNG</p><h2>Thấy trước hành trình.</h2></div></div><iframe className="detail-map" src={route.mapEmbedSrc} title={`Bản đồ tuyến ${route.from} đến ${route.to}`} loading="lazy" /></div>

          <div className="detail-stops"><div className="section-heading detail-heading"><div><p className="section-label">LOẠI XE PHÙ HỢP</p><h2>Đi tuyến này bằng xe gì?</h2></div></div><div className="departure-list">{expandVehiclePrices(route.pricingByVehicle).map((vehicle) => <Link key={vehicle.vehicleType} href={routeComboHref(route, vehicleTypeSlug(vehicle.vehicleType))} className="vehicle-chip">{vehicle.vehicleType}</Link>)}</div></div>
        </div>
        <aside className="detail-aside" id="booking"><div className="booking-card"><p className="section-label">ĐẶT CHUYẾN</p><h2>Sẵn sàng lên đường?</h2><p>Để lại thông tin, đội ngũ Xe Miền Nam sẽ gọi lại xác nhận trong ít phút.</p><Button size="lg" asChild><a href="tel:19006789">Gọi 1900 6789 <Phone data-icon="inline-end" /></a></Button><span className="booking-note"><ShieldCheck size={16} /> Không cần thanh toán trước</span></div><div className="departures-card"><p className="section-label">KHUNG GIỜ KHÁCH HAY CHỌN</p><div className="departure-list">{route.departures.map((time) => <span key={time}>{time}</span>)}</div><ul className="detail-notes">{route.notes.map((note) => <li key={note}><Check size={15} />{note}</li>)}</ul></div></aside>
      </section>

      {relatedRoutes.length > 0 && <section className="related-section section-wrap"><div className="section-heading"><div><p className="section-label">CÙNG TỈNH {route.region.toUpperCase()}</p><h2>Các tuyến liên quan.</h2></div><Link className="text-link" href={`/tuyen-duong/${route.regionSlug}`}>Xem tất cả tuyến <ArrowRight size={17} /></Link></div><div className="route-list related-list">{relatedRoutes.map((related) => <DetailCard route={related} key={related.id} />)}</div></section>}
      {testimonials.length > 0 && <section className="section-wrap route-testimonials"><div className="section-heading"><div><p className="section-label">KHÁCH HÀNG CHIA SẺ</p><h2>Những hành trình được tin chọn.</h2></div><Link className="text-link" href="/danh-gia">Xem tất cả đánh giá <ArrowRight size={17} /></Link></div><div className="combo-testimonial-grid">{testimonials.map((testimonial) => <TestimonialCard key={testimonial.id} testimonial={testimonial} />)}</div></section>}
      {relatedPosts.length > 0 && <section className="section-wrap route-related-blog"><div className="section-heading"><div><p className="section-label">CẨM NANG HÀNH TRÌNH</p><h2>Bài viết liên quan.</h2></div><Link className="text-link" href="/blog">Xem tất cả bài viết <ArrowRight size={17} /></Link></div><div className="blog-grid">{relatedPosts.map((post) => <BlogCard key={post.id} post={post} />)}</div></section>}
      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}
