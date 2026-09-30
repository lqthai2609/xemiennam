"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, CarFront, ChevronRight, Factory, Info, MapPin, MessageCircle, Phone, Search, ShieldCheck, TicketCheck, Trees, UsersRound, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { routeHref, type Route, type RoutePricingPackage } from "@/types/route";
import type { DiemDen } from "@/types/diem-den";
import type { AirportConnectionLink } from "@/lib/api/airport-routes";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { formatPublicLocationText, getPublicLocationLabel } from "@/lib/public-location-label";
import { locationMatchesQuery } from "@/lib/location-search";
import { getZaloChatLink } from "@/lib/zalo";

const vehicleSuggestions = [
  { slug: "4-cho", type: "4 chỗ", className: "car-left", description: "Phù hợp khách đi cá nhân, cặp đôi hoặc nhóm nhỏ." },
  { slug: "7-cho", type: "7 chỗ", className: "car-center", description: "Rộng rãi, thoải mái cho gia đình hoặc nhóm bạn." },
  { slug: "16-cho", type: "16 chỗ", className: "car-right", description: "Phù hợp đoàn đông, công ty, đi công tác hoặc du lịch." },
] as const;
type Category = "all" | "city" | "industrial" | "travel" | "district";
const categoryOptions = [
  { key: "all", label: "Tất cả", icon: MapPin },
  { key: "city", label: "Đô thị", icon: Building2 },
  { key: "industrial", label: "Khu công nghiệp", icon: Factory },
  { key: "travel", label: "Du lịch", icon: Trees },
  { key: "district", label: "Huyện / thị xã", icon: Building2 },
] as const;

function routeCategory(route: Route): Category {
  const name = route.to.toLocaleLowerCase("vi");
  if (/kcn|vsip|khu công nghiệp|công nghiệp/.test(name)) return "industrial";
  if (/du lịch|đại nam|hồ |thác|núi |suối|vườn|biển|chùa|đảo/.test(name)) return "travel";
  if (/dĩ an|thuận an|thủ dầu một|tp\. mới|thành phố|trung tâm/.test(name)) return "city";
  return "district";
}

function oneWayFourSeatPrice(route: Route): RoutePricingPackage | undefined {
  if (!route.pricingV2?.outbound.enabled) return undefined;
  return route.pricingV2.outbound.packages.find((item) => item.vehicleType === "4 chỗ" && item.packageKey === "one_way" && item.mode !== "disabled");
}

function RouteCard({ route, imageUrl }: { route: Route; imageUrl?: string }) {
  const from = getPublicLocationLabel(route.from), to = getPublicLocationLabel(route.to);
  const price = oneWayFourSeatPrice(route);
  const legacy = !route.pricingV2 ? route.pricingByVehicle.find((item) => item.vehicleType === "4 chỗ" && (!item.priceType || item.priceType === "one_way")) : undefined;
  const fixedPrice = price?.mode === "fixed" && typeof price.price === "number" && price.price > 0 ? price.priceLabel || `${Math.round(price.price / 1000).toLocaleString("vi-VN")}K` : legacy && legacy.pricingMode !== "contact" ? legacy.price : undefined;
  return <article className="province-route-card"><Link href={routeHref(route)} className="province-route-image" aria-label={`Xem tuyến ${from} đi ${to}`}>{imageUrl && <Image src={route.featuredImage || imageUrl} alt="" fill sizes="(max-width: 700px) 92px, 110px" />}</Link><div className="province-route-copy"><h3><Link href={routeHref(route)}>{from} <ArrowRight size={13} aria-hidden="true" /> {to}</Link></h3><p className={fixedPrice ? "province-route-fixed" : "province-route-contact"}>{fixedPrice ? <>Giá chỉ <strong>{fixedPrice}</strong></> : "Liên hệ báo giá"}</p><small>Xe 4 chỗ · Một chiều/chuyến</small></div><Link href={routeHref(route)} className="province-route-link">Xem tuyến <ArrowRight size={15} aria-hidden="true" /></Link></article>;
}

export function DiemDenDetailPage({ regionName, hub, routes, airportConnections = [], heroImageUrl }: { regionName: string; hub?: DiemDen; routes: Route[]; airportConnections?: AirportConnectionLink[]; heroImageUrl?: string }) {
  const publicRegionName = getPublicLocationLabel(regionName);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const zaloLink = getZaloChatLink();
  const availableCategories = useMemo(() => categoryOptions.filter((item) => item.key === "all" || routes.some((route) => routeCategory(route) === item.key)), [routes]);
  const visibleRoutes = useMemo(() => routes.filter((route) => (category === "all" || routeCategory(route) === category) && (!query.trim() || locationMatchesQuery(route.to, query.trim()) || locationMatchesQuery(route.from, query.trim()))), [routes, category, query]);
  const industryRoutes = routes.filter((route) => routeCategory(route) === "industrial");
  const travelRoutes = routes.filter((route) => routeCategory(route) === "travel");

  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); document.getElementById("province-routes")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function chooseCategory(next: Category) { setCategory(next); setQuery(""); document.getElementById("province-routes")?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  return <main className="site-shell home-redesign province-redesign">
    <SiteHeader menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Bảng giá", "Liên hệ"].includes(item.label))} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink || "/lien-he"} homeDesign />
    <section className="province-hero" aria-labelledby="province-title">{heroImageUrl && <Image src={heroImageUrl} alt="" fill priority sizes="100vw" className="province-hero-photo" />}<div className="province-width province-hero-inner"><nav className="province-breadcrumb" aria-label="Đường dẫn"><Link href="/diem-den">⌂ <span>Điểm đến</span></Link><span>/</span><span>{publicRegionName}</span></nav><div className="province-hero-copy"><p className="home-eyebrow">TUYẾN ĐƯỜNG THEO TỈNH THÀNH</p><h1 id="province-title">Thuê xe đi<br />{publicRegionName}</h1><p>Xe riêng có tài xế từ Sài Gòn. Chọn điểm đến, loại xe và lịch trình phù hợp.</p><div className="province-hero-pills"><span><CarFront size={18} aria-hidden="true" />{routes.length} tuyến đang phục vụ</span><span><CalendarDays size={18} aria-hidden="true" />Chủ động giờ đón</span><span><ShieldCheck size={18} aria-hidden="true" />Xe riêng có tài xế</span></div><div className="province-hero-actions"><a className="home-button home-button-primary" href="#province-routes"><Search size={20} aria-hidden="true" />Khám phá các tuyến <ArrowRight size={17} aria-hidden="true" /></a>{zaloLink && <a className="home-button home-button-outline" href={zaloLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} aria-hidden="true" />Nhắn Zalo tư vấn</a>}</div></div></div></section>
    <div className="province-width province-content"><section className="province-benefits" aria-label="Lợi ích khi đặt xe"><div><span><UsersRound aria-hidden="true" /></span><p><strong>Xe riêng có tài xế</strong><small>Thoải mái, an toàn, phù hợp mọi nhu cầu di chuyển từ Sài Gòn.</small></p></div><div><span><CalendarDays aria-hidden="true" /></span><p><strong>Đón trả theo nhu cầu</strong><small>Chủ động thời gian, đón trả nơi theo lịch trình của bạn.</small></p></div><div><span><TicketCheck aria-hidden="true" /></span><p><strong>Xác nhận giá trước chuyến</strong><small>Minh bạch, rõ ràng, không phát sinh chi phí bất ngờ.</small></p></div></section>
      <section className="province-routes" id="province-routes" aria-labelledby="province-routes-title"><div className="province-heading"><h2 id="province-routes-title">Chọn điểm đến tại {publicRegionName}</h2><p>Tìm nhanh tuyến phù hợp từ Sài Gòn.</p></div><form className="province-search" onSubmit={search}><label><Search size={23} aria-hidden="true" /><span className="sr-only">Tìm điểm đến trong tỉnh</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Tìm địa điểm tại ${publicRegionName}...`} />{query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}><X size={17} /></button>}</label><button type="submit" className="home-button home-button-primary">Tìm tuyến <ArrowRight size={17} aria-hidden="true" /></button></form><div className="province-categories" role="group" aria-label="Lọc tuyến theo loại điểm đến">{availableCategories.map((item) => <button type="button" key={item.key} className={category === item.key ? "active" : ""} aria-pressed={category === item.key} onClick={() => chooseCategory(item.key)}><item.icon size={17} aria-hidden="true" />{item.key === "all" ? `Tất cả ${routes.length}` : item.label}</button>)}</div>{visibleRoutes.length ? <div className="province-route-grid">{visibleRoutes.map((route) => <RouteCard key={route.id} route={route} imageUrl={heroImageUrl} />)}</div> : <div className="province-empty" role="status">Chưa tìm thấy tuyến phù hợp. Hãy thử địa điểm hoặc nhóm khác.</div>}</section>
      <p className="province-pricing-note"><Info size={19} aria-hidden="true" /><span>Giá chỉ áp dụng cho xe 4 chỗ, chiều {getPublicLocationLabel(routes[0]?.from || "Sài Gòn")} đi {publicRegionName}, một chiều/chuyến. Giá cuối cùng được xác nhận trước khi khởi hành.</span></p>
      <section className="province-vehicles" aria-labelledby="province-vehicles-title"><div className="province-heading"><h2 id="province-vehicles-title">Chọn xe phù hợp cho hành trình</h2><p>Đa dạng loại xe, phục vụ tốt mọi nhu cầu từ cá nhân, gia đình đến đoàn nhóm.</p></div><div className="province-vehicle-grid">{vehicleSuggestions.map((item) => <article key={item.slug} className={item.slug === "7-cho" ? "popular" : ""}>{item.slug === "7-cho" && <span className="province-popular">Được đặt nhiều nhất</span>}<Link href={`/loai-xe/${item.slug}`} className={`province-vehicle-image ${item.className}`} aria-label={`Xem xe ${item.type}`} /><div><h3>Xe {item.type}</h3><p>{item.description}</p><Link href={`/loai-xe/${item.slug}`}>Xem chi tiết <ArrowRight size={15} aria-hidden="true" /></Link></div></article>)}</div></section>
      {(industryRoutes.length > 0 || travelRoutes.length > 0) && <section className="province-explore" aria-labelledby="province-explore-title"><div className="province-heading"><h2 id="province-explore-title">Khám phá {publicRegionName} theo cách của bạn</h2><p>Dù đi công tác hay đi chơi, luôn có hành trình phù hợp cùng {SITE_NAME}.</p></div><div className="province-explore-grid">{industryRoutes.length > 0 && <button type="button" onClick={() => chooseCategory("industrial")} className="province-explore-card"><span className="province-explore-photo">{heroImageUrl && <Image src={heroImageUrl} alt="" fill sizes="(max-width: 700px) 50vw, 50vw" />}</span><span className="province-explore-caption"><strong>Đi công tác và khu công nghiệp</strong><small>Chủ động di chuyển đến các trung tâm hành chính, khu công nghiệp.</small><b>Xem các tuyến <ArrowRight size={15} /></b></span></button>}{travelRoutes.length > 0 && <button type="button" onClick={() => chooseCategory("travel")} className="province-explore-card"><span className="province-explore-photo">{heroImageUrl && <Image src={heroImageUrl} alt="" fill sizes="(max-width: 700px) 50vw, 50vw" />}</span><span className="province-explore-caption"><strong>Đi chơi cùng gia đình</strong><small>Khám phá các điểm vui chơi và nghỉ dưỡng tại {publicRegionName}.</small><b>Xem các tuyến <ArrowRight size={15} /></b></span></button>}</div></section>}
      {airportConnections.length > 0 && <section className="province-airports" aria-labelledby="province-airports-title"><h2 id="province-airports-title">Tuyến sân bay liên quan</h2><div>{airportConnections.map((airport) => <Link key={airport.airportId} href={airport.href}>{airport.label} · {airport.routeCount} tuyến <ChevronRight size={16} /></Link>)}</div></section>}
      {hub && (hub.contentHtml || hub.faqItems.length > 0) && <details className="province-more"><summary>Thông tin thêm về {publicRegionName}</summary>{hub.contentHtml && <div className="province-more-copy blog-detail-body" dangerouslySetInnerHTML={{ __html: formatPublicLocationText(hub.contentHtml) }} />}{hub.faqItems.map((item, index) => <details key={`${item.question}-${index}`} className="province-faq"><summary>{formatPublicLocationText(item.question)}</summary><p>{formatPublicLocationText(item.answer)}</p></details>)}</details>}
      <section className="province-contact" aria-labelledby="province-contact-title"><div><h2 id="province-contact-title">Chưa thấy tuyến bạn cần?</h2><p>Liên hệ ngay để được tư vấn tuyến đường và báo giá nhanh nhất.</p></div><div>{zaloLink && <a className="home-button home-button-primary" href={zaloLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} /> Nhắn Zalo để được tư vấn</a>}<Link className="home-button home-button-outline province-request" href="/lien-he"><BriefcaseBusiness size={18} /> Gửi yêu cầu</Link><a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={18} /> {SITE_HOTLINE}</a></div></section>
    </div>
    <SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "Khám phá", links: [{ label: "Trang chủ", href: "/" }, { label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Điểm đến", href: "/diem-den" }, { label: "Loại xe", href: "/loai-xe" }, { label: "Bảng giá", href: "/bang-gia" }] }, { title: "Hỗ trợ", links: [{ label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" }, { label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}
