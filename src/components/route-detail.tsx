"use client";

import { useEffect, useState } from "react";
import { ZaloIcon } from "@/components/zalo-icon";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, FileText, MapPin, Phone, Route as RouteIcon, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RoutePricingSection } from "@/components/route-pricing-section";
import { BlogCard } from "@/components/blog-card";
import { routeComboHref, routeHref, vehicleTypeSlug, type Route, type RoutePricingDirectionKey } from "@/types/route";
import { navItems } from "@/data/nav";
import type { Testimonial } from "@/types/testimonial";
import type { BlogPost } from "@/types/blog";
import { reverseRouteMapEmbedSrc } from "@/lib/maps";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { formatPublicLocationText, getPublicLocationLabel } from "@/lib/public-location-label";
import { getZaloChatLink } from "@/lib/zalo";

const regionImages: Record<string, string> = {
  "Bà Rịa - Vũng Tàu": "/images/destinations/ba-ria-vung-tau.webp",
  "Cần Thơ": "/images/destinations/can-tho.webp",
  "Tây Ninh": "/images/destinations/tay-ninh.webp",
  "Đồng Nai": "/images/destinations/dong-nai.webp",
  "Phan Thiết": "/images/destinations/phan-thiet.webp",
};

function defaultDirection(route: Route): RoutePricingDirectionKey {
  if (route.pricingV2?.outbound.enabled) return "outbound";
  if (route.pricingV2?.inbound.enabled) return "inbound";
  return "outbound";
}

function RelatedCard({ route }: { route: Route }) {
  const href = routeHref(route);
  const image = route.featuredImage || (/sân bay/i.test(route.from) ? "/images/services/airport.png" : regionImages[route.region] || "/images/home-coastal-fleet.webp");
  return <Link href={href} className="route-detail-design-related-card">
    <span className="route-detail-design-related-image"><Image src={image} alt="" fill sizes="(max-width: 700px) 25vw, 100px" /></span>
    <span><strong>{getPublicLocationLabel(route.from)} đi {getPublicLocationLabel(route.to)}</strong><small>Xe riêng, chủ động thời gian</small></span>
    <span className="route-detail-design-related-arrow"><ArrowRight size={17} /></span>
  </Link>;
}

export function RouteDetailPage({ route, relatedRoutes, testimonials, relatedPosts, vehicleImageByType = {} }: {
  route: Route;
  relatedRoutes: Route[];
  testimonials: Testimonial[];
  relatedPosts: BlogPost[];
  vehicleImageByType?: Record<string, string>;
}) {
  const [direction, setDirection] = useState<RoutePricingDirectionKey>(() => defaultDirection(route));

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("direction");
    if (requested !== "outbound" && requested !== "inbound") return;
    if (route.pricingV2 ? !route.pricingV2[requested].enabled : requested !== "outbound") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDirection(requested);
  }, [route]);

  const prelaunch = isPrelaunchAirportRoute(route);
  const inbound = direction === "inbound";
  const from = getPublicLocationLabel(inbound ? route.to : route.from);
  const to = getPublicLocationLabel(inbound ? route.from : route.to);
  const mapSrc = inbound ? reverseRouteMapEmbedSrc(route.mapEmbedSrc, from, to) : route.mapEmbedSrc;
  const distance = route.distance.trim() && route.distance !== "0 km" ? route.distance : "";
  const time = route.time.trim() && route.time !== "0" ? route.time : "";
  const zaloLink = getZaloChatLink();
  const description = prelaunch
    ? `Tuyến ${from} đi ${to} đang chuẩn bị. Liên hệ để được tư vấn; chưa nhận đặt chuyến.`
    : inbound
      ? `Xe riêng có tài xế từ ${from} đến ${to}, chủ động thời gian và điểm đón.`
      : formatPublicLocationText(route.summary || `Xe riêng có tài xế từ ${from} đến ${to}, chủ động thời gian và điểm đón.`);
  const heroImage = route.featuredImage || regionImages[route.region] || "/images/home-coastal-fleet.webp";
  const reverseAvailable = Boolean(route.pricingV2?.outbound.enabled && route.pricingV2?.inbound.enabled);

  return <main className="site-shell home-redesign route-detail-redesign">
    <SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink || "/lien-he"} homeDesign />

    <section className="route-detail-design-hero" aria-labelledby="route-detail-title">
      <Image src={heroImage} alt="" fill priority sizes="100vw" className="route-detail-design-hero-image" />
      <div className="route-detail-design-hero-inner"><p className="home-eyebrow">{prelaunch ? "TUYẾN ĐANG CHUẨN BỊ" : "TUYẾN ĐƯỜNG"}</p>
        <h1 id="route-detail-title">{prelaunch ? "Thông tin tuyến" : "Xe riêng"} {from}<br />đi {to}</h1>
        <p>{description}</p>
        {(distance || time) && <div className="route-detail-design-hero-meta">
          {distance && <span><MapPin aria-hidden="true" />{distance}</span>}
          {time && <span><Clock3 aria-hidden="true" />{time}</span>}
          <small>Thời gian di chuyển dự kiến tùy tình hình giao thông.</small>
        </div>}
      </div>
    </section>

    <div className="route-detail-design-main">
      <section className="route-detail-design-pricing" aria-label="Chọn gói và xe cho tuyến">
        <div id="pricing"><RoutePricingSection route={route} direction={direction} onDirectionChange={setDirection} vehicleImageByType={vehicleImageByType} prelaunch={prelaunch} redesign /></div>
      </section>

      <section className="route-detail-design-journey" aria-labelledby="route-journey-title">
        <div className="route-detail-design-section-heading"><h2 id="route-journey-title">Hành trình {from} – {to}</h2><p>{prelaunch ? "Lộ trình và lịch phục vụ sẽ được xác nhận khi tuyến sẵn sàng." : "Lộ trình tham khảo; điểm đón và trả được xác nhận theo lịch trình của bạn."}</p></div>
        <div className="route-detail-design-journey-grid">
          <div className="route-detail-design-map">
            {mapSrc && !prelaunch ? <iframe src={mapSrc} title={`Bản đồ tuyến ${from} đến ${to}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="route-detail-design-map-placeholder"><RouteIcon size={39} /><strong>{from} – {to}</strong><span>Bản đồ hành trình đang được cập nhật</span></div>}
          </div>
          <div className="route-detail-design-journey-facts">
            {distance && <div><MapPin /><p><strong>{distance}</strong><span>Quãng đường di chuyển<br />từ {from} đến {to}</span></p></div>}
            {time && <div><Clock3 /><p><strong>{time}</strong><span>Thời gian di chuyển dự kiến<br />tùy tình hình giao thông</span></p></div>}
            <div><RouteIcon /><p><strong>Điểm đón / trả</strong><span>Xác nhận khi tư vấn<br />phù hợp với lịch trình của bạn</span></p></div>
          </div>
        </div>
        {route.vehicleTypes.length > 0 && <div className="route-detail-design-vehicle-links"><strong>Loại xe trên tuyến</strong>{route.vehicleTypes.map((vehicle) => <Link key={vehicle} href={routeComboHref(route, vehicleTypeSlug(vehicle))}>{vehicle} <ArrowRight size={14} /></Link>)}</div>}
        {route.departures.length > 0 && <div className="route-detail-design-vehicle-links"><strong>Khung giờ tham khảo</strong>{route.departures.map((time) => <span className="route-detail-design-time" key={time}>{time}</span>)}</div>}
        {route.notes.length > 0 && <ul className="route-detail-design-notes">{route.notes.map((note) => <li key={note}>{formatPublicLocationText(note)}</li>)}</ul>}
      </section>
    </div>

    <section className="route-detail-design-benefits" aria-labelledby="route-benefits-title"><div className="route-detail-design-width">
      <h2 id="route-benefits-title">Đi xe riêng, chủ động cả hành trình</h2>
      <div className="route-detail-design-benefit-grid">
        <div><span><UsersRound /></span><p><strong>Xe riêng có tài xế</strong><small>Tài xế am hiểu tuyến đường, hỗ trợ suốt hành trình.</small></p></div>
        <div><span><CalendarDays /></span><p><strong>Chủ động lịch trình</strong><small>Tự do chọn giờ đi, điểm đón trả phù hợp với nhu cầu của bạn.</small></p></div>
        <div><span><FileText /></span><p><strong>Xác nhận giá trước chuyến đi</strong><small>Báo giá rõ ràng, xác nhận trước khi sắp xếp xe.</small></p></div>
      </div>
    </div></section>

    <div className="route-detail-design-main route-detail-design-lower">
      <section className="route-detail-design-faq" aria-labelledby="route-faq-title"><div className="route-detail-design-section-heading"><h2 id="route-faq-title">Câu hỏi thường gặp</h2></div>
        <details><summary><span>1</span>{prelaunch ? `Tuyến ${to} đã nhận đặt xe chưa?` : `Làm thế nào để đặt xe đi ${to}?`}</summary><p>{prelaunch ? "Tuyến đang chuẩn bị và chưa nhận đặt chuyến. Bạn có thể liên hệ để được tư vấn trước." : `Chọn loại xe và gói hành trình ở trên, sau đó nhắn Zalo, gửi yêu cầu hoặc gọi ${SITE_HOTLINE}. ${SITE_NAME} sẽ xác nhận lịch và điều kiện chuyến đi.`}</p></details>
        <details><summary><span>2</span>Có thể đặt xe khứ hồi {from} – {to} không?</summary><p>{reverseAvailable ? "Bạn có thể chọn chiều về hoặc gói khứ hồi nếu gói này đang hiển thị trong phần chọn xe và giá. Giá được xác nhận theo gói và loại xe đã chọn." : "Vui lòng liên hệ để được tư vấn hành trình chiều về theo dữ liệu tuyến và lịch xe hiện có."}</p></details>
        <details><summary><span>3</span>Giá xe có được xác nhận trước chuyến đi không?</summary><p>Giá hiển thị áp dụng cho đúng chiều, loại xe và gói đã chọn. {SITE_NAME} xác nhận chi phí cuối cùng trước khi nhận chuyến; tổ hợp chưa có giá sẽ được báo giá riêng.</p></details>
      </section>

      {relatedRoutes.length > 0 && <section className="route-detail-design-related" aria-labelledby="route-related-title"><div className="route-detail-design-section-heading"><h2 id="route-related-title">Tuyến đường liên quan</h2><Link href={`/tuyen-duong/${route.regionSlug}`}>Khám phá thêm các tuyến xe <ArrowRight size={16} /></Link></div><div className="route-detail-design-related-grid">{relatedRoutes.slice(0, 3).map((item) => <RelatedCard route={item} key={item.id} />)}</div></section>}

      {testimonials.length > 0 && <section className="route-detail-design-extra" aria-labelledby="route-reviews-title"><div className="route-detail-design-section-heading"><h2 id="route-reviews-title">Khách hàng chia sẻ</h2><Link href="/danh-gia">Xem thêm đánh giá <ArrowRight size={16} /></Link></div><div className="route-detail-design-review-grid">{testimonials.slice(0, 3).map((item) => <blockquote key={item.id}><p>“{item.quote}”</p><footer>{item.name}</footer></blockquote>)}</div></section>}
      {relatedPosts.length > 0 && <section className="route-detail-design-extra" aria-labelledby="route-posts-title"><div className="route-detail-design-section-heading"><h2 id="route-posts-title">Cẩm nang hành trình</h2><Link href="/blog">Xem bài viết khác <ArrowRight size={16} /></Link></div><div className="blog-grid">{relatedPosts.map((post) => <BlogCard post={post} key={post.id} />)}</div></section>}

      <section className="route-detail-design-contact" aria-labelledby="route-contact-title"><div><span className="home-eyebrow">ALO ĐẶT XE</span><h2 id="route-contact-title">{prelaunch ? `Cần tư vấn tuyến ${to}?` : `Sẵn sàng đi ${to}?`}</h2><p>{prelaunch ? "Liên hệ để được tư vấn hành trình; tuyến chưa nhận đặt chuyến." : "Đặt xe ngay để có chuyến đi thoải mái, chủ động lịch trình của bạn."}</p></div><div className="route-detail-design-contact-actions">
        {zaloLink && <a className="home-button home-button-primary zalo-cta" href={zaloLink} target="_blank" rel="noopener noreferrer"><ZaloIcon /> {prelaunch ? "Nhắn Zalo tư vấn" : "Nhắn Zalo đặt xe"}</a>}
        {!prelaunch && <a className="home-button home-button-outline" href="#pricing"><FileText size={17} /> Chọn xe gửi yêu cầu</a>}
        <a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={17} /> Gọi {SITE_HOTLINE}</a>
      </div></section>
    </div>

    <SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "Khám phá", links: [{ label: "Trang chủ", href: "/" }, { label: "Tuyến xe", href: "/tuyen-duong" }, { label: "Loại xe", href: "/loai-xe" }] }, { title: "Hỗ trợ", links: [{ label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}
