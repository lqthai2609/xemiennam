import Link from "next/link";
import { ArrowRight, BusFront, Check, Clock3, MapPin, Milestone, Phone, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { MediaPhoto } from "@/components/media-photo";
import { RouteBookingActions } from "@/components/route-booking-actions";
import { priceTypeLabel, routeHref, routeComboHref, vehicleTypeSlug, type Route } from "@/types/route";
import { navItems } from "@/data/nav";
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
  const routeLabel = `${route.from} – ${route.to}`;
  const heroImage = route.featuredImage || "/images/services/city-tour.png";
  return (
    <main className="site-shell route-detail-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="#booking" />
      <UnifiedHero eyebrow={route.heroNote} title={<> {route.from}<br /><em>→ {route.to}</em></>} description={route.summary} backgroundImage={heroImage} backHref={`/tuyen-duong/${route.regionSlug || "khac"}`} backLabel={`Tất cả tuyến ${route.region}`} /><section className="detail-content section-wrap">
        <div className="detail-main">
          <div className="section-heading detail-heading"><div><p className="section-label">GIÁ THUÊ XE THAM KHẢO</p><h2>Chọn cách bạn muốn đi.</h2></div><p className="heading-note">Giá đã gồm phí cầu đường.<br />Không có phụ phí ẩn.</p></div>
          <div className="detail-price-grid">
            {route.pricingByVehicle.map((vp) => (
              <article className="detail-price-card" key={vp.vehicleType}>
                <div className="detail-price-media">
                  {vehicleImageByType[vp.vehicleType] ? (
                    <MediaPhoto src={vehicleImageByType[vp.vehicleType]} alt={vp.vehicleType} />
                  ) : (
                    <BusFront size={32} strokeWidth={1.4} />
                  )}
                </div>
                <Link href={`/loai-xe/${vehicleTypeSlug(vp.vehicleType)}`} className="vehicle-chip">
                  {vp.vehicleType}
                </Link>
                <strong>{vp.price}</strong>
                <small>{priceTypeLabel(vp.priceType)} · Giá tham khảo</small>
                <Button size="sm" variant="outline" asChild>
                  <Link href={routeComboHref(route, vehicleTypeSlug(vp.vehicleType))}>
                    Thuê xe {vp.vehicleType} đi {route.to} <ArrowRight size={15} />
                  </Link>
                </Button>
                <RouteBookingActions route={routeLabel} vehicleType={vp.vehicleType} price={vp.price} />
              </article>
            ))}
          </div>

          <div className="detail-stops"><div className="section-heading detail-heading"><div><p className="section-label">ĐIỂM ĐÓN & TRẢ</p><h2>Điểm nào cũng gần bạn.</h2></div></div><div className="stops-grid"><div><span className="stop-kicker"><MapPin size={15} /> Điểm đón tại {route.from}</span><ul>{route.pickupPoints.map((stop) => <li key={stop}><span className="stop-dot" />{stop}</li>)}</ul></div><div><span className="stop-kicker"><MapPin size={15} /> Điểm trả tại {route.to}</span><ul>{route.dropoffPoints.map((stop) => <li key={stop}><span className="stop-dot destination" />{stop}</li>)}</ul></div></div></div>

          <div className="detail-map-wrap"><div className="section-heading detail-heading"><div><p className="section-label">CUNG ĐƯỜNG</p><h2>Thấy trước hành trình.</h2></div></div><iframe className="detail-map" src={route.mapEmbedSrc} title={`Bản đồ tuyến ${route.from} đến ${route.to}`} loading="lazy" /></div>

          <div className="detail-stops"><div className="section-heading detail-heading"><div><p className="section-label">LOẠI XE PHÙ HỢP</p><h2>Đi tuyến này bằng xe gì?</h2></div></div><div className="departure-list">{route.vehicleTypes.map((vehicle) => <Link key={vehicle} href={routeComboHref(route, vehicleTypeSlug(vehicle))} className="vehicle-chip">{vehicle}</Link>)}</div></div>
        </div>
        <aside className="detail-aside" id="booking"><div className="booking-card"><p className="section-label">ĐẶT CHUYẾN</p><h2>Sẵn sàng lên đường?</h2><p>Để lại thông tin, đội ngũ Xe Miền Nam sẽ gọi lại xác nhận trong ít phút.</p><Button size="lg" asChild><a href="tel:19006789">Gọi 1900 6789 <Phone data-icon="inline-end" /></a></Button><span className="booking-note"><ShieldCheck size={16} /> Không cần thanh toán trước</span></div><div className="departures-card"><p className="section-label">KHUNG GIỜ KHÁCH HAY CHỌN</p><div className="departure-list">{route.departures.map((time) => <span key={time}>{time}</span>)}</div><ul className="detail-notes">{route.notes.map((note) => <li key={note}><Check size={15} />{note}</li>)}</ul></div></aside>
      </section>

      {relatedRoutes.length > 0 && <section className="related-section section-wrap"><div className="section-heading"><div><p className="section-label">TUYẾN ĐƯỜNG TẠI {route.region.toUpperCase()}</p><h2>Các tuyến liên quan.</h2></div><Link className="text-link" href={`/tuyen-duong/${route.regionSlug}`}>Xem tất cả tuyến <ArrowRight size={17} /></Link></div><div className="route-related-grid">{relatedRoutes.map((related) => <DetailCard route={related} key={related.id} />)}</div></section>}

      {testimonials.length > 0 && <section className="section-wrap route-testimonials"><div className="section-heading"><div><p className="section-label">KHÁCH HÀNG NÓI GÌ</p><h2>Trải nghiệm trên tuyến này.</h2></div><Link className="text-link" href="/danh-gia">Xem tất cả đánh giá <ArrowRight size={17} /></Link></div><div className="combo-testimonial-grid">{testimonials.map((item) => <article className="combo-testimonial-card" key={item.id}><div className="combo-testimonial-stars" aria-label={`${item.rating} trên 5 sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < item.rating ? "currentColor" : "none"} />)}</div><p>“{item.quote}”</p><div className="combo-testimonial-who"><span className="combo-testimonial-avatar">{item.initials}</span><b>{item.name}</b></div></article>)}</div></section>}

      {relatedPosts.length > 0 && <section className="section-wrap route-blog-section"><div className="section-heading"><div><p className="section-label">CẨM NANG {route.region.toUpperCase()}</p><h2>Bài viết liên quan.</h2></div><Link className="text-link" href="/blog">Xem tất cả bài viết <ArrowRight size={17} /></Link></div><div className="blog-grid">{relatedPosts.map((post) => <BlogCard post={post} key={post.id} />)}</div></section>}
      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}
