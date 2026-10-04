import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CarFront } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { navItems } from "@/data/nav";
import type { Service } from "@/types/service";
import type { Route } from "@/types/route";
import { ServiceCard } from "@/components/service-card";
import { BookingSearchForm } from "@/components/route-finder-form";
import { ServiceContactBanner, ServiceFeatureList, ServiceSteps, serviceImage, servicePromises } from "@/components/service-design-shared";
import { ZaloIcon } from "@/components/zalo-icon";
import { SITE_CONTACT_PHONE_DISPLAY, SITE_CONTACT_PHONE_TEL } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";
import "@/app/home-redesign.css";
import "./services-redesign.css";

const serviceOrder = ["dua-don-san-bay", "city-tour-trong-ngay", "city-tour", "xe-cuoi", "dua-don-nhan-vien-cong-ty", "thue-xe-theo-thang"];
export function ServicesPage({ services, routes, vehicleImages = {} }: { services: Service[]; routes: Route[]; vehicleImages?: Record<string, string> }) {
  const ordered = [...services].sort((a, b) => { const rank = (s: Service) => { const i = serviceOrder.indexOf(s.slug); return i < 0 ? serviceOrder.length : i; }; return rank(a) - rank(b); });
  const heroImage = services.find(s => s.slug === "dua-don-san-bay")?.image || "/images/services/airport.png";
  return <main className="site-shell home-redesign service-redesign">
    <SiteHeader menuItems={navItems} hotline={SITE_CONTACT_PHONE_DISPLAY} hotlineHref={`tel:${SITE_CONTACT_PHONE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={getZaloChatLink()} homeDesign />
    <section className="svc-index-hero"><div className="svc-container svc-index-hero-grid"><div className="svc-index-hero-copy"><p className="svc-eyebrow">DỊCH VỤ CỦA ALO ĐẶT XE</p><h1>Mỗi hành trình,<br /><em>một cách phục vụ</em><br />phù hợp</h1><p>Xe riêng có tài xế. Lịch trình linh hoạt theo nhu cầu của bạn.</p><div className="svc-actions"><Link className="svc-button svc-button-blue svc-explore" href="#services">Khám phá dịch vụ<ArrowRight aria-hidden="true" /></Link><a className="svc-button svc-button-zalo zalo-cta" href={getZaloChatLink()} target="_blank" rel="noopener noreferrer"><ZaloIcon />Nhắn Zalo tư vấn<ArrowRight aria-hidden="true" /></a></div></div><div className="svc-index-hero-art"><Image src={heroImage} alt="Dịch vụ xe riêng đưa đón khách tại sân bay" fill preload sizes="(max-width: 800px) 100vw, 55vw" /><div className="svc-hero-stamp"><CarFront aria-hidden="true" /><div><strong>Xe riêng · Tài xế riêng</strong><span>Chủ động lịch trình của bạn</span></div></div><div className="svc-hero-inset"><Image src="/images/vehicle-use-cases.webp" alt="Xe riêng phục vụ hành trình của bạn" fill sizes="240px" /></div></div></div></section>
    <section className="svc-promise-band"><div className="svc-container"><ServiceFeatureList items={servicePromises} /></div></section>
    <section className="svc-catalog svc-container" id="services"><div className="svc-heading svc-heading-center"><p className="svc-eyebrow">DỊCH VỤ NỔI BẬT</p><h2>Chọn dịch vụ <em>phù hợp</em></h2><p>Đa dạng dịch vụ xe riêng có tài xế, đáp ứng cho cả nhu cầu cá nhân và doanh nghiệp.</p></div>{ordered.length ? <div className="svc-card-grid">{ordered.map(service => <ServiceCard key={service.slug} service={service} image={serviceImage(service, vehicleImages)} redesign />)}</div> : <div className="route-empty" role="status"><h3>Hiện chưa có dịch vụ được công bố</h3><p>Alo Đặt Xe vẫn nhận tư vấn hành trình trực tiếp.</p><Link className="svc-button svc-button-blue" href="/lien-he">Liên hệ tư vấn</Link></div>}</section>
    <section className="svc-process-band"><div className="svc-container"><div className="svc-heading svc-heading-center"><p className="svc-eyebrow">QUY TRÌNH ĐẶT XE</p><h2>Đặt xe theo nhu cầu, <em>thật đơn giản</em></h2><p>Chỉ với 3 bước, bạn đã có thể đặt xe riêng với lịch trình phù hợp.</p></div><ServiceSteps /><div className="home-booking-wrap svc-booking"><BookingSearchForm routes={routes} variant="hero" mobileStacked id="booking" source="services_catalog" /></div></div></section>
    <ServiceContactBanner /><SiteFooter />
  </main>;
}
