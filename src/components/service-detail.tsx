import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, FileText, Info, MapPin, Route as RouteIcon, UsersRound, type LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { navItems } from "@/data/nav";
import type { Service } from "@/types/service";
import { ServiceContactActions, ServiceContactBanner, ServiceFeatureList, ServiceSteps, serviceImage, servicePromises, type ServiceFeature } from "@/components/service-design-shared";
import { SITE_CONTACT_PHONE_DISPLAY, SITE_CONTACT_PHONE_TEL } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";
import "@/app/home-redesign.css";
import "./services-redesign.css";

const businessPromises: ServiceFeature[] = [
  { title: "Tuyến đón rõ ràng", description: "Xây dựng lộ trình cụ thể, hẹn các điểm đón trước khi vận hành.", icon: MapPin },
  { title: "Lịch xe theo ca", description: "Sắp xếp giờ đón – trả phù hợp với thời gian làm việc của doanh nghiệp.", icon: CalendarDays },
  { title: "Phương án xe phù hợp", description: "Tư vấn loại xe và số lượng xe theo quy mô nhân sự thực tế.", icon: UsersRound },
];
const businessPlan: ServiceFeature[] = [
  { title: "Tuyến cố định", description: "Thiết kế lộ trình phù hợp theo khu vực và nhu cầu di chuyển.", icon: RouteIcon },
  { title: "Điểm đón thống nhất", description: "Sắp xếp các điểm đón hợp lý, thuận tiện cho nhân viên.", icon: MapPin },
  { title: "Khung giờ theo ca", description: "Linh hoạt theo ca làm việc sáng, chiều, đêm của doanh nghiệp.", icon: Clock3 },
  { title: "Điều phối theo quy mô", description: "Bố trí số lượng xe, tần suất phù hợp với số lượng nhân viên thực tế.", icon: UsersRound },
];
const businessChecklist = [
  { title: "Số nhân viên", description: "Tổng số lượng nhân viên cần đưa đón.", icon: UsersRound },
  { title: "Khu vực và điểm đón", description: "Các khu vực và điểm đón dự kiến.", icon: MapPin },
  { title: "Ca làm việc", description: "Thời gian làm việc (sáng, chiều, đêm).", icon: Clock3 },
  { title: "Số ngày hoạt động", description: "Số ngày xe hoạt động trong tuần.", icon: CalendarDays },
  { title: "Thời hạn hợp đồng", description: "Dự kiến thời gian hợp tác (tháng, quý...).", icon: FileText },
];
const tripChecklist = [
  { title: "Số người đi", description: "Số hành khách và hành lý cần mang theo.", icon: UsersRound },
  { title: "Điểm đón và điểm đến", description: "Địa điểm và các điểm dừng dự kiến.", icon: MapPin },
  { title: "Thời gian di chuyển", description: "Ngày đi, giờ đón và lịch trình mong muốn.", icon: CalendarDays },
];
function RouteIllustration() {
  return <div className="svc-route-illustration"><svg viewBox="0 0 360 250" role="img" aria-label="Minh họa phương án tuyến với nhiều điểm đón"><rect width="360" height="250" rx="16" fill="#eff7fa" /><g stroke="#fff" strokeWidth="16"><path d="M-20 80 380 160M60-10 130 270M260-20 220 270M-10 210 370 30" /></g><g fill="#d7eddd"><path d="m15 10 50 5 9 36-46 5Z"/><path d="m288 178 52 2-9 52-63-8Z"/><path d="m140 15 49-5-7 31-32 2Z"/></g><path d="M65 170V85H155V140H280V68" fill="none" stroke="#0000d8" strokeWidth="5" strokeLinejoin="round"/><path d="M155 140V202H305" fill="none" stroke="#ff5122" strokeWidth="4"/><g fill="#0000d8" stroke="#fff" strokeWidth="3"><circle cx="65" cy="170" r="10"/><circle cx="155" cy="85" r="10"/></g><g fill="#ff5122" stroke="#fff" strokeWidth="3"><circle cx="280" cy="68" r="10"/><circle cx="305" cy="202" r="10"/></g><g transform="translate(162 121) rotate(6)"><rect width="52" height="29" rx="6" fill="#0000d8"/><rect x="5" y="5" width="9" height="13" rx="2" fill="#fff"/><rect x="18" y="5" width="9" height="13" rx="2" fill="#fff"/><rect x="31" y="5" width="14" height="13" rx="2" fill="#fff"/><circle cx="12" cy="29" r="5" fill="#07165d"/><circle cx="41" cy="29" r="5" fill="#07165d"/></g></svg><small>Minh họa phương án tuyến</small></div>;
}
export function ServiceDetail({ service, vehicleImages = {} }: { service: Service; vehicleImages?: Record<string, string> }) {
  const business = service.slug === "dua-don-nhan-vien-cong-ty";
  const image = serviceImage(service, vehicleImages);
  const plan: ServiceFeature[] = business ? businessPlan : (service.useCases?.length ? service.useCases.map((s, i) => ({ ...s, icon: i % 2 ? MapPin : RouteIcon })) : servicePromises);
  const promises = business ? businessPromises : servicePromises;
  const badges: { title: string; description: string; icon: LucideIcon }[] = business ? [
    { title: "Theo ca làm việc", description: "Linh hoạt khung giờ", icon: Clock3 },
    { title: "Nhiều điểm đón", description: "Thuận tiện cho nhân viên", icon: MapPin },
    { title: "Hợp đồng tháng / quý", description: "Phù hợp nhu cầu doanh nghiệp", icon: FileText },
  ] : [{ title: "Lịch trình riêng", description: "Theo nhu cầu của bạn", icon: Clock3 }, { title: "Đón tận nơi", description: "Thống nhất trước chuyến đi", icon: MapPin }];
  const faqs = business ? [
    { q: "Có thể đón tại nhiều điểm?", a: "Có thể sắp xếp nhiều điểm đón trong cùng một tuyến. Lộ trình và điểm đón cần thống nhất trước khi triển khai." },
    { q: "Có thể đặt theo ca làm việc?", a: "Lịch xe được bố trí theo khung giờ ca làm việc của công ty. Hãy cung cấp giờ bắt đầu và kết thúc ca để được tư vấn." },
    { q: "Báo giá được tính như thế nào?", a: "Báo giá riêng theo số lượng nhân viên, quãng đường thực tế, lịch xe và thời hạn hợp đồng." },
  ] : [{ q: "Làm thế nào để đặt dịch vụ?", a: "Gửi nhu cầu qua Zalo hoặc trang liên hệ. Đội ngũ tư vấn sẽ xác nhận lịch trình, loại xe và báo giá trước khi chốt chuyến." }, { q: "Có thể chọn loại xe phù hợp với nhóm?", a: "Chúng tôi tư vấn theo số người, hành lý và lịch trình thực tế. Loại xe được xác nhận khi đặt dịch vụ." }, { q: "Báo giá được tính như thế nào?", a: "Báo giá theo loại xe, thời gian sử dụng và lịch trình đã thống nhất. Vui lòng gửi nhu cầu cụ thể để được tư vấn." }];
  return <main className="site-shell home-redesign service-redesign svc-detail">
    <SiteHeader menuItems={navItems} hotline={SITE_CONTACT_PHONE_DISPLAY} hotlineHref={`tel:${SITE_CONTACT_PHONE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={getZaloChatLink()} homeDesign />
    <section className="svc-detail-hero"><div className="svc-detail-hero-image"><Image src={image} alt={`Dịch vụ ${service.name}`} fill preload sizes="100vw" /></div><div className="svc-container svc-detail-hero-inner"><div className="svc-detail-hero-copy"><nav className="svc-breadcrumb" aria-label="Đường dẫn"><Link href="/dich-vu">Dịch vụ</Link><span>/</span><span>{service.name}</span></nav><p className="svc-eyebrow">{business ? "GIẢI PHÁP DI CHUYỂN DOANH NGHIỆP" : "DỊCH VỤ XE RIÊNG CÓ TÀI XẾ"}</p><h1>{business ? <>Đưa đón nhân viên<br />đúng giờ, đúng tuyến</> : service.name}</h1><p>{business ? "Lịch trình cố định theo ca làm việc, nhiều điểm đón linh hoạt, phù hợp cho doanh nghiệp, khu công nghiệp và văn phòng." : service.shortDescription}</p><ServiceContactActions quote /></div><div className="svc-hero-badges">{badges.map(({ title, description, icon: Icon }) => <div key={title}><span className="svc-icon"><Icon aria-hidden="true" /></span><div><strong>{title}</strong><small>{description}</small></div></div>)}</div></div></section>
    <section className="svc-detail-promise"><div className="svc-container"><ServiceFeatureList items={promises} /></div></section>
    <section className="svc-solution svc-blue-band"><div className="svc-container svc-solution-grid"><div><div className="svc-heading"><p className="svc-eyebrow">{business ? "GIẢI PHÁP ỔN ĐỊNH LÂU DÀI" : "PHƯƠNG ÁN PHỤC VỤ"}</p><h2>{business ? <>Một lịch trình ổn định<br />cho cả đội ngũ</> : "Một hành trình phù hợp với nhu cầu"}</h2><p>{service.detailDescription}</p></div><ServiceFeatureList items={plan} className="svc-plan-features" /></div><div className="svc-solution-image"><Image src={image} alt={business ? "Xe phục vụ lịch đưa đón nhân viên" : `Xe riêng cho ${service.name}`} fill sizes="(max-width: 800px) 100vw, 45vw" /></div></div></section>
    <section className="svc-implementation svc-container"><div><div className="svc-heading"><p className="svc-eyebrow">QUY TRÌNH TRIỂN KHAI</p><h2>{business ? "Thiết kế phương án đưa đón theo doanh nghiệp" : "Chuẩn bị hành trình theo nhu cầu của bạn"}</h2><p>Chỉ với 3 bước đơn giản, chúng tôi sẽ tư vấn phương án di chuyển phù hợp với nhu cầu thực tế.</p></div><ServiceSteps business /></div><RouteIllustration /></section>
    {service.vehicleTypes.length > 0 && <section className="svc-vehicles svc-blue-band"><div className="svc-container"><div className="svc-heading"><p className="svc-eyebrow">CHỌN XE PHÙ HỢP</p><h2>{business ? "Chọn xe theo số lượng nhân viên" : "Chọn xe phù hợp với hành trình"}</h2><p>{business ? "Tư vấn loại xe phù hợp với quy mô nhân sự và lộ trình di chuyển thực tế của doanh nghiệp." : "Tư vấn theo số hành khách, hành lý và lịch trình của bạn."}</p></div><div className="svc-vehicle-list">{service.vehicleTypes.map(type => { const vehicleImage = vehicleImages[type.slug]; return <article className="svc-vehicle" key={type.slug}><div className="svc-vehicle-image"><Image src={vehicleImage || image} alt={`Xe ${type.name.replace(/^Xe\s*/i, "")}`} fill sizes="(max-width: 800px) 100vw, 45vw" /></div><div><h3>{/^xe/i.test(type.name) ? type.name : `Xe ${type.name}`}</h3><p>{type.description || (business ? "Phù hợp cho doanh nghiệp có nhu cầu đưa đón theo tuyến cố định. Tư vấn bố trí xe theo số lượng nhân viên và lịch làm việc thực tế." : "Xe riêng có tài xế, được tư vấn theo số hành khách và lịch trình thực tế.")}</p><Link className="svc-text-link" href={`/loai-xe/${type.slug}`}>Xem loại xe<ArrowRight aria-hidden="true" /></Link></div></article>; })}</div>{service.suggestedVehicles.length > 0 && <div className="svc-suggested-vehicles">{service.suggestedVehicles.map(v => <Link href={`/loai-xe/${v.slug}`} key={`${v.slug}-${v.name}`}><strong>{v.name}</strong><span>{v.detail}</span></Link>)}</div>}</div></section>}
    <section className="svc-details-bottom svc-container"><div><div className="svc-heading"><p className="svc-eyebrow">THÔNG TIN CẦN CHUẨN BỊ</p><h2>Thông tin cần chuẩn bị để báo giá</h2><p>Để nhận báo giá phù hợp, vui lòng cung cấp một số thông tin sau:</p></div><div className="svc-checklist">{(business ? businessChecklist : tripChecklist).map(({ title, description, icon: Icon }) => <div key={title}><span className="svc-icon"><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>{service.notes.length > 0 && <details className="svc-notes"><summary>Lưu ý riêng cho dịch vụ này</summary><ul>{service.notes.map(note => <li key={note}>{note}</li>)}</ul></details>}</div><div><div className="svc-heading"><p className="svc-eyebrow">CÂU HỎI THƯỜNG GẶP</p><h2>Một số thắc mắc phổ biến</h2></div><div className="svc-faq" id="service-faq">{faqs.map(faq => <details key={faq.q}><summary>{faq.q}</summary><p>{faq.a}</p></details>)}</div><div className="svc-price-note"><Info aria-hidden="true" /><p>Báo giá riêng theo lộ trình và nhu cầu thực tế.</p></div></div></section>
    {service.slug === "dua-don-san-bay" && <section className="svc-related svc-container"><h2>Khám phá tuyến sân bay</h2><Link className="svc-text-link" href="/san-bay/tan-son-nhat">Xem các tuyến Sân bay Tân Sơn Nhất<ArrowRight aria-hidden="true" /></Link></section>}
    {Boolean(service.relatedRoutes?.length) && <section className="svc-related svc-container"><h2>Tuyến đường phù hợp</h2><div>{service.relatedRoutes!.map(route => <article key={route.href}><Link className="svc-text-link" href={route.href}>{route.name}<ArrowRight aria-hidden="true" /></Link>{route.summary && <p>{route.summary}</p>}<div className="svc-related-combos">{route.combos.map(combo => <Link href={combo.href} key={combo.href}>{combo.vehicleType}</Link>)}</div></article>)}</div></section>}
    <ServiceContactBanner business={business} image={image} /><SiteFooter />
  </main>;
}
