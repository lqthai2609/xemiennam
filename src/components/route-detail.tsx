"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Clock3, MapPin, Phone, ShieldCheck, Users, Plane, CarFront, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { RoutePricingSection } from "@/components/route-pricing-section";
import { type Route, type RoutePricingDirectionKey } from "@/types/route";
import { navItems } from "@/data/nav";
import type { Testimonial } from "@/types/testimonial";
import type { BlogPost } from "@/types/blog";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import "@/app/route-modern.css";

const faqs = [
  ["Giá thuê xe từ sân bay Tân Sơn Nhất đi Phú Mỹ bao nhiêu?", "Giá tham khảo từ 550.000đ cho xe 4 chỗ một chiều. Mức giá thực tế được xác nhận theo lịch đón và loại xe."],
  ["Giá 550.000đ áp dụng cho xe mấy chỗ?", "Mức giá từ 550.000đ hiện áp dụng cho xe 4 chỗ, một chiều, theo điều kiện vận hành thực tế."],
  ["Có đón khách tại sân bay Tân Sơn Nhất không?", "Có. Tài xế đón tận nơi tại sân bay và đưa thẳng đến địa chỉ tại Phú Mỹ."],
  ["Có nhận chuyến ban đêm không?", "Có nhận chuyến theo lịch. Vui lòng liên hệ trước để kiểm tra xe và xác nhận phụ phí nếu có."],
  ["Có thể đặt xe trước bao lâu?", "Bạn nên đặt trước ít nhất một ngày để được giữ xe và sắp xếp tài xế phù hợp."],
  ["Có thể yêu cầu xe 7 chỗ, 16 chỗ hoặc xe lớn hơn không?", "Có. Alo Đặt Xe nhận điều phối nhiều loại xe từ 4 đến 45 chỗ và limousine."],
];

function defaultDirection(route: Route): RoutePricingDirectionKey {
  if (route.pricingV2?.outbound.enabled) return "outbound";
  if (route.pricingV2?.inbound.enabled) return "inbound";
  return "outbound";
}

export function RouteDetailPage({ route, vehicleImageByType = {} }: { route: Route; relatedRoutes: Route[]; testimonials: Testimonial[]; relatedPosts: BlogPost[]; vehicleImageByType?: Record<string, string> }) {
  const [direction, setDirection] = useState<RoutePricingDirectionKey>(() => defaultDirection(route));
  const from = getPublicLocationLabel(direction === "inbound" ? route.to : route.from);
  const to = getPublicLocationLabel(direction === "inbound" ? route.from : route.to);
  const heroImage = route.featuredImage || "/images/hero-dat-xe-sai-gon.webp";

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("direction");
    if (requested === "outbound" || requested === "inbound") setDirection(requested);
  }, []);

  return (
    <main className="route-modern-page">
      <SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Đặt xe ngay" ctaHref="#booking" />

      <section className="route-hero-modern" style={{ backgroundImage: `linear-gradient(90deg, rgba(27,42,74,.98) 0%, rgba(27,42,74,.9) 48%, rgba(27,42,74,.35) 100%), url(${heroImage})` }}>
        <div className="route-container route-hero-grid">
          <div className="route-hero-copy"><p className="route-kicker">THUÊ XE SÂN BAY</p><h1>{from} <span>→</span> {to}</h1><p className="route-lead">Xe riêng có tài xế <b>•</b> Đón tận nơi <b>•</b> Đi thẳng</p><div className="route-price"><small>Từ</small><strong>{route.price || "550.000đ"}</strong><small>/ chuyến</small></div><div className="route-hero-actions"><Button size="lg" asChild><a href="#booking">ĐẶT XE NGAY <ArrowRight data-icon="inline-end" /></a></Button><Button size="lg" variant="outline" className="route-call-btn" asChild><a href={`tel:${SITE_HOTLINE_TEL}`}><Phone data-icon="inline-start" /> GỌI {SITE_HOTLINE}</a></Button></div></div>
          <div className="route-hero-note"><span>ĐÓN TẬN NƠI</span><strong>550K</strong><small>Giá tham khảo xe 4 chỗ<br />một chiều</small></div>
        </div>
      </section>

      <div className="route-container route-quick-info">{[[CarFront, "Xe riêng"], [Users, "Có tài xế"], [Plane, "Đón tại sân bay"], [CalendarDays, "Phục vụ theo lịch"], [Phone, SITE_HOTLINE]].map(([Icon, label]) => <div key={String(label)}><Icon /><span>{label as string}</span></div>)}</div>

      <section className="route-container route-section" id="pricing"><div className="route-section-heading"><div><p className="route-kicker route-kicker-dark">BẢNG GIÁ THAM KHẢO</p><h2>Giá thuê xe đi {to}</h2><p>Chọn loại xe phù hợp với số lượng hành khách và nhu cầu di chuyển.</p></div></div><RoutePricingSection route={route} direction={direction} onDirectionChange={setDirection} vehicleImageByType={vehicleImageByType} /></section>

      <section className="route-slate-section"><div className="route-container route-section"><div className="route-section-heading"><div><p className="route-kicker route-kicker-dark">CUNG ĐƯỜNG</p><h2>Hành trình {from} → {to}</h2></div></div><div className="route-trip-grid"><div className="route-timeline"><div><span className="route-timeline-icon"><Plane /></span><div><b>{from}</b><small>Điểm đón</small></div></div><span className="route-timeline-line" /><div><span className="route-timeline-icon"><MapPin /></span><div><b>{to}</b><small>Điểm trả</small></div></div></div><div className="route-trip-facts"><div><Clock3 /><span>Thời gian dự kiến</span><b>{route.time || "1 giờ 30 phút"}</b></div><div><MapPin /><span>Quãng đường</span><b>{route.distance || "Khoảng 60 km"}</b></div><div><ShieldCheck /><span>Hình thức</span><b>Xe riêng, đi thẳng</b></div><p>Thời gian có thể thay đổi theo tình hình giao thông và thời điểm đón khách.</p></div></div></div></section>

      <section className="route-container route-section"><div className="route-section-heading centered"><p className="route-kicker route-kicker-dark">DỊCH VỤ TẬN TÂM</p><h2>Vì sao nên đặt xe riêng đi {to}?</h2></div><div className="route-benefits">{[[CarFront, "Xe riêng", "Không ghép khách, chủ động thời gian."], [Users, "Có tài xế", "Tài xế đón và đưa khách tận nơi."], [Plane, "Đón sân bay", "Hỗ trợ đón khách tại sân bay Tân Sơn Nhất."], [ShieldCheck, "Xác nhận giá trước chuyến", "Thông tin chuyến đi rõ ràng trước khi khởi hành."]].map(([Icon, title, text]) => <article key={title as string}><Icon /><h3>{title as string}</h3><p>{text as string}</p></article>)}</div></section>

      <section className="route-process"><div className="route-container route-section"><div className="route-section-heading centered"><p className="route-kicker">ĐẶT XE ĐƠN GIẢN</p><h2>Đặt xe chỉ với 3 bước</h2></div><div className="route-steps">{[["01", "Gửi thông tin chuyến đi"], ["02", "Xác nhận loại xe và giá"], ["03", "Tài xế đón khách"]].map(([number, title]) => <div key={number}><strong>{number}</strong><span>{title}</span></div>)}</div></div></section>

      <section className="route-container route-section route-faq"><div className="route-section-heading centered"><p className="route-kicker route-kicker-dark">GIẢI ĐÁP NHANH</p><h2>Câu hỏi thường gặp</h2></div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><p>{answer}</p></details>)}</section>

      <section className="route-final-cta" id="booking"><div className="route-container"><div><p className="route-kicker">SẴN SÀNG LÊN ĐƯỜNG?</p><h2>Bạn cần xe từ {from} đi {to}?</h2><p>Đặt xe trước để được xác nhận xe và giá theo lịch thực tế.</p></div><div className="route-final-actions"><Button size="lg" asChild><a href={`tel:${SITE_HOTLINE_TEL}`}>ĐẶT XE NGAY <ArrowRight data-icon="inline-end" /></a></Button><Button size="lg" variant="outline" className="route-call-btn" asChild><a href={`tel:${SITE_HOTLINE_TEL}`}><Phone data-icon="inline-start" /> GỌI {SITE_HOTLINE}</a></Button></div></div></section>

      <SiteFooter tagline={<>{SITE_NAME} đồng hành trên mọi hành trình.<br />Thuê xe chủ động, an toàn và minh bạch.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Dịch vụ", href: "/dich-vu" }] }, { title: "HỖ TRỢ", links: [{ label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={defaultSocialLinks} copyright={`© 2026 ${SITE_NAME}`} madeFor="Made for the road." brandName={SITE_NAME} />
      <div className="route-mobile-sticky"><a href={`tel:${SITE_HOTLINE_TEL}`}><Phone /> Gọi ngay</a><a href={`https://zalo.me/${SITE_HOTLINE_TEL.replace(/\D/g, "")}`}>Zalo</a><a className="sticky-book" href="#booking">ĐẶT XE</a></div>
    </main>
  );
}

