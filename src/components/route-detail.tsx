"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, MapPin, Milestone, Phone, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { RoutePricingSection } from "@/components/route-pricing-section";
import {
  routeHref,
  routeComboHref,
  routePriceKicker,
  vehicleTypeSlug,
  type Route,
  type RoutePricingDirectionKey,
} from "@/types/route";
import { navItems } from "@/data/nav";
import { UnifiedHero } from "@/components/unified-hero";
import { BlogCard } from "@/components/blog-card";
import type { Testimonial } from "@/types/testimonial";
import type { BlogPost } from "@/types/blog";
import { reverseRouteMapEmbedSrc } from "@/lib/maps";
import { SITE_HOTLINE, SITE_HOTLINE_TEL } from "@/lib/site-config";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Cẩm nang đi đường", href: "/blog" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Chính sách huỷ chuyến", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

function DetailCard({ route }: { route: Route }) {
  return (
    <Link className="route-ticket related-ticket" href={routeHref(route)}>
      <div className="rt-price"><span>{routePriceKicker(route)}</span><b>{route.price}</b></div>
      <div className="rt-body"><div className="rt-route"><span>{route.from}</span><ArrowRight size={16} /><span>{route.to}</span></div><div className="rt-meta"><span><Clock3 size={13} /> {route.time}</span><span><Milestone size={13} /> {route.distance}</span></div></div>
      <div className="rt-cta">Xem tuyến <ArrowRight size={14} /></div>
    </Link>
  );
}

function directionDescription(route: Route, direction: RoutePricingDirectionKey): string {
  if (direction === "outbound" && route.summary) return route.summary;
  const from = direction === "outbound" ? route.from : route.to;
  const to = direction === "outbound" ? route.to : route.from;
  return `Thuê xe nguyên chiếc từ ${from} đến ${to}. Chọn loại xe và gói hành trình phù hợp, xem giá theo đúng chiều hoặc liên hệ Gocar VN để nhận báo giá theo lịch thực tế.`;
}

function defaultDirection(route: Route): RoutePricingDirectionKey {
  if (route.pricingV2?.outbound.enabled) return "outbound";
  if (route.pricingV2?.inbound.enabled) return "inbound";
  return "outbound";
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
  const [direction, setDirection] = useState<RoutePricingDirectionKey>(() => defaultDirection(route));
  // Một số tuyến chưa có featured image trong CMS. Dùng ảnh WebP nhẹ làm fallback
  // thay cho city-tour.png (2.3 MB), vì hero luôn là ảnh LCP được tải ưu tiên.
  const heroImage = route.featuredImage || "/images/hero-dat-xe-sai-gon.webp";
  const isInbound = direction === "inbound";
  const displayFrom = isInbound ? route.to : route.from;
  const displayTo = isInbound ? route.from : route.to;
  const pickupPoints = isInbound ? route.dropoffPoints : route.pickupPoints;
  const dropoffPoints = isInbound ? route.pickupPoints : route.dropoffPoints;
  const heroEyebrow = isInbound ? `CHIỀU ${displayFrom.toUpperCase()} → ${displayTo.toUpperCase()}` : route.heroNote;
  const mapEmbedSrc = isInbound
    ? reverseRouteMapEmbedSrc(route.mapEmbedSrc, displayFrom, displayTo)
    : route.mapEmbedSrc;

  return (
    <main className="site-shell route-detail-page">
      <SiteHeader menuItems={navItems} hotline="0898 400 800" ctaLabel="Đặt xe ngay" ctaHref="#booking" />
      <UnifiedHero eyebrow={heroEyebrow} title={<>{displayFrom}<br /><em>→ {displayTo}</em></>} description={directionDescription(route, direction)} backgroundImage={heroImage} backHref={`/tuyen-duong/${route.regionSlug || "khac"}`} backLabel={`Tất cả tuyến ${route.region}`} />
      <section className="detail-content section-wrap">
        <div className="detail-main">
          <div className="section-heading detail-heading"><div><p className="section-label">GIÁ THUÊ XE THEO CHIỀU</p><h2>Chọn cách bạn muốn đi.</h2></div><p className="heading-note">Giá và package hiển thị theo đúng chiều đã chọn.<br />Không dùng giá mặc định của chiều ngược lại.</p></div>
          <div id="pricing">
            <RoutePricingSection route={route} direction={direction} onDirectionChange={setDirection} vehicleImageByType={vehicleImageByType} />
          </div>

          <div className="detail-stops"><div className="section-heading detail-heading"><div><p className="section-label">ĐIỂM ĐÓN & TRẢ</p><h2>Điểm nào cũng gần bạn.</h2></div></div><div className="stops-grid"><div><span className="stop-kicker"><MapPin size={15} /> Điểm đón tại {displayFrom}</span><ul>{pickupPoints.map((stop) => <li key={stop}><span className="stop-dot" />{stop}</li>)}</ul></div><div><span className="stop-kicker"><MapPin size={15} /> Điểm trả tại {displayTo}</span><ul>{dropoffPoints.map((stop) => <li key={stop}><span className="stop-dot destination" />{stop}</li>)}</ul></div></div></div>

          <div className="detail-map-wrap"><div className="section-heading detail-heading"><div><p className="section-label">CUNG ĐƯỜNG</p><h2>Thấy trước hành trình.</h2></div></div><iframe className="detail-map" src={mapEmbedSrc} title={`Bản đồ tuyến ${displayFrom} đến ${displayTo}`} loading="lazy" /></div>

          <div className="detail-stops"><div className="section-heading detail-heading"><div><p className="section-label">LOẠI XE PHÙ HỢP</p><h2>Đi tuyến này bằng xe gì?</h2></div></div><div className="departure-list">{route.vehicleTypes.map((vehicle) => <Link key={vehicle} href={routeComboHref(route, vehicleTypeSlug(vehicle))} className="vehicle-chip">{vehicle}</Link>)}</div></div>
        </div>
        <aside className="detail-aside" id="booking"><div className="booking-card"><p className="section-label">ĐẶT CHUYẾN</p><h2>Sẵn sàng lên đường?</h2><p>Liên hệ Gocar VN để xác nhận xe, lịch đón và mức giá theo chiều {displayFrom} → {displayTo}.</p><Button size="lg" asChild><a href={`tel:${SITE_HOTLINE_TEL}`}>Gọi {SITE_HOTLINE} <Phone data-icon="inline-end" /></a></Button><span className="booking-note"><ShieldCheck size={16} /> Không cần thanh toán trước</span></div><div className="departures-card"><p className="section-label">KHUNG GIỜ KHÁCH HAY CHỌN</p><div className="departure-list">{route.departures.map((time) => <span key={time}>{time}</span>)}</div><ul className="detail-notes">{route.notes.map((note) => <li key={note}><Check size={15} />{note}</li>)}</ul></div></aside>
      </section>

      {relatedRoutes.length > 0 && <section className="related-section section-wrap"><div className="section-heading"><div><p className="section-label">TUYẾN ĐƯỜNG LIÊN QUAN</p><h2>Thêm lựa chọn tại {route.region}.</h2></div><Link className="text-link" href={`/tuyen-duong/${route.regionSlug}`}>Xem tất cả tuyến <ArrowRight size={17} /></Link></div><div className="route-related-grid">{relatedRoutes.map((related) => <DetailCard route={related} key={related.id} />}</div></section>}

      {testimonials.length > 0 && <section className="section-wrap route-testimonials"><div className="section-heading"><div><p className="section-label">KHÁCH HÀNG NÓI GÌ</p><h2>Trải nghiệm trên tuyến này.</h2></div><Link className="text-link" href="/danh-gia">Xem tất cả đánh giá <ArrowRight size={17} /></Link></div><div className="combo-testimonial-grid">{testimonials.map((item) => <article className="combo-testimonial-card" key={item.id}><div className="combo-testimonial-stars" aria-label={`${item.rating} trên 5 sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < item.rating ? "currentColor" : "none"} />)}</div><p>“{item.quote}”</p><div className="combo-testimonial-who"><span className="combo-testimonial-avatar">{item.initials}</span><b>{item.name}</b></div></article>)}</div></section>}

      {relatedPosts.length > 0 && <section className="section-wrap route-blog-section"><div className="section-heading"><div><p className="section-label">CẨM NANG {route.region.toUpperCase()}</p><h2>Bài viết liên quan.</h2></div><Link className="text-link" href="/blog">Xem tất cả bài viết <ArrowRight size={17} /></Link></div><div className="blog-grid">{relatedPosts.map((post) => <BlogCard post={post} key={post.id} />}</div></section>}
      <SiteFooter tagline={<>Gocar VN đồng hành trên mọi hành trình.<br />Thuê xe chủ động, an toàn và minh bạch.</>} phone={SITE_HOTLINE} linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Gocar VN" madeFor="Made for the road." />
    </main>
  );
}
