"use client";

import { useEffect, useMemo, useState } from "react";
import { ZaloIcon } from "@/components/zalo-icon";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, CarFront, ChevronRight, Clock3, Flame, MapPin, Phone, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingSearchForm } from "@/components/route-finder-form";
import { RouteDestinationSearch } from "@/components/route-destination-search";
import { emptyFilters, routeHref, routePriceKicker, type FilterState, type Route } from "@/types/route";
import { navItems } from "@/data/nav";
import { locationMatchesQuery } from "@/lib/location-search";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

const preferredRegions = ["Bà Rịa - Vũng Tàu", "Cần Thơ", "Tây Ninh", "Đồng Nai"];
const featuredPlaces = ["Vũng Tàu", "Hồ Tràm", "Long Hải"];
function displayRegion(region: string) { return getPublicLocationLabel(region).replaceAll("&amp;", "&"); }
function routeRank(route: Route) {
  const fromSaigon = getPublicLocationLabel(route.from) === "Sài Gòn";
  const destination = featuredPlaces.findIndex((place) => route.to === place);
  return (fromSaigon ? 0 : 100) + (destination < 0 ? 20 : destination);
}
const images: Record<string, string> = {
  "Bà Rịa - Vũng Tàu": "/images/destinations/ba-ria-vung-tau.webp",
  "Vũng Tàu": "/images/destinations/ba-ria-vung-tau.webp",
  "Hồ Tràm": "/images/destinations/phan-thiet.webp",
  "Long Hải": "/images/destinations/ba-ria-vung-tau.webp",
  "Cần Thơ": "/images/destinations/can-tho.webp",
  "Tây Ninh": "/images/destinations/tay-ninh.webp",
  "Đồng Nai": "/images/destinations/dong-nai.webp",
  "Đà Lạt": "/images/destinations/da-lat.webp",
  "Bình Dương": "/images/destinations/binh-duong.webp",
  "Phan Thiết": "/images/destinations/phan-thiet.webp",
};

function RouteCard({ route }: { route: Route }) {
  const href = routeHref(route);
  const fixed = route.pricingV2?.outbound.featured?.mode === "fixed";
  const fallbackImage = /sân bay/i.test(route.from) || /sân bay/i.test(route.to)
    ? "/images/services/airport.png"
    : images[route.to] || images[route.region] || "/images/home-coastal-fleet.webp";
  const image = route.featuredImage || fallbackImage;
  return <article className="routes-design-card">
    <Link href={href} className="routes-design-card-image" aria-label={`Xem tuyến ${getPublicLocationLabel(route.from)} đi ${getPublicLocationLabel(route.to)}`}>
      <Image src={image} alt="" fill sizes="(max-width: 700px) 40vw, 30vw" />
    </Link>
    <div className="routes-design-card-body">
      <h3>{getPublicLocationLabel(route.from)} đi {getPublicLocationLabel(route.to)}</h3>
      <p className="routes-design-card-meta"><span><MapPin size={13} /> {route.distance}</span><span><Clock3 size={13} /> {route.time}</span></p>
      <div className="routes-design-card-bottom">
        <div><small>{fixed ? "Giá chỉ" : routePriceKicker(route)}</small><strong>{route.price}</strong><small>{fixed ? "Một chiều / chuyến" : "Giá theo chuyến"}</small></div>
        <Link href={href}>Xem tuyến <ArrowRight size={16} /></Link>
      </div>
    </div>
  </article>;
}

export function RoutesPageClient({ routes }: { routes: Route[] }) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);
  const zaloLink = getZaloChatLink();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const destination = params.get("diem_den") || params.get("to") || params.get("from") || "";
    const area = params.get("khu_vuc") || "";
    const vehicleType = params.get("loai_xe") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (destination) setDestinationQuery(destination);
    if (area || vehicleType) setFilters((current) => ({ ...current, area, vehicleType }));
  }, []);

  const filteredRoutes = useMemo(() => {
    const hasDirectDestination = destinationQuery && routes.some((route) => locationMatchesQuery(route.to, destinationQuery));
    return routes.filter((route) =>
      (!filters.area || route.to === filters.area) &&
      (!filters.vehicleType || route.vehicleTypes.includes(filters.vehicleType)) &&
      (!destinationQuery || [route.from, route.to, ...(hasDirectDestination ? [] : [route.region])].some((place) => locationMatchesQuery(place, destinationQuery))),
    );
  }, [destinationQuery, filters, routes]);

  const groups = useMemo(() => {
    const map = new Map<string, Route[]>();
    filteredRoutes.forEach((route) => map.set(route.region, [...(map.get(route.region) || []), route]));
    return [...map.entries()].map(([region, regionRoutes]) => [region, [...regionRoutes].sort((a, b) => routeRank(a) - routeRank(b))] as const).sort(([a], [b]) => {
      const x = preferredRegions.indexOf(a), y = preferredRegions.indexOf(b);
      return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || a.localeCompare(b, "vi");
    });
  }, [filteredRoutes]);
  const popular = ["Vũng Tàu", "Hồ Tràm", "Tây Ninh", "Cần Thơ", "Đồng Nai"]
    .filter((place) => routes.some((route) => locationMatchesQuery(route.to, place) || locationMatchesQuery(route.region, place)));

  function selectPlace(place: string) {
    setDestinationQuery(place);
    document.getElementById("route-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className="site-shell home-redesign routes-design">
    <SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink || "/lien-he"} homeDesign />
    <section className="routes-design-hero" aria-labelledby="routes-design-title"><div className="routes-design-hero-inner">
      <p className="home-eyebrow">TUYẾN ĐƯỜNG</p><h1 id="routes-design-title">Tìm tuyến xe<br />phù hợp với bạn</h1><p>Xe riêng có tài xế, chủ động lịch trình</p>
    </div></section>
    <div className="routes-design-main">
      <div className="home-booking-wrap routes-catalog-booking">
        <BookingSearchForm routes={routes} variant="hero" mobileStacked id="booking" source="routes_catalog" />
      </div>
      {popular.length > 0 && <div className="routes-design-popular" aria-label="Điểm đến phổ biến"><strong><Flame size={23} /> Điểm đến phổ biến</strong><div>
        {popular.map((place) => <button key={place} type="button" onClick={() => selectPlace(place)} className={destinationQuery === place ? "is-selected" : ""}><Image src={images[place]} width={31} height={31} alt="" />{place}</button>)}
        <button type="button" onClick={() => selectPlace("")}>Xem tất cả <ArrowRight size={14} /></button>
      </div></div>}
      <section className="routes-design-catalog" id="route-catalog" aria-labelledby="routes-catalog-title">
        <div className="routes-design-catalog-heading"><h2 id="routes-catalog-title">Khám phá các tuyến đường</h2><p>Chọn khu vực yêu thích để xem các tuyến đường phổ biến</p></div>
        <div className="routes-design-catalog-search"><RouteDestinationSearch routes={routes} value={destinationQuery} onChange={setDestinationQuery} /></div>
        <div className="routes-design-catalog-layout">
          <nav className="routes-design-regions" aria-label="Khu vực tuyến đường">{groups.map(([region, regionRoutes], index) => <a className={index === 0 ? "is-active" : ""} href={`#region-${regionRoutes[0].regionSlug || index}`} key={region}><MapPin size={18} />{displayRegion(region)}<ChevronRight size={16} /></a>)}</nav>
          <div className="routes-design-groups" aria-live="polite">{groups.length ? groups.map(([region, regionRoutes], index) => {
            const id = `region-${regionRoutes[0].regionSlug || index}`;
            const expanded = expandedRegions.includes(region);
            return <section className="routes-design-region" id={id} key={region} aria-labelledby={`${id}-title`}>
              <div className="routes-design-region-heading"><div><h3 id={`${id}-title`}>{displayRegion(region)}</h3><span>{regionRoutes.length} tuyến</span></div><Link href={`/tuyen-duong/${regionRoutes[0].regionSlug}`}>Xem khu vực <ArrowRight size={17} /></Link></div>
              <div className="routes-design-card-grid">{(expanded ? regionRoutes : regionRoutes.slice(0, 4)).map((route) => <RouteCard route={route} key={route.id} />)}</div>
              {!expanded && regionRoutes.length > 4 && <button className="routes-design-more" type="button" onClick={() => setExpandedRegions((current) => [...current, region])}>Xem thêm {regionRoutes.length - 4} tuyến <ArrowRight size={16} /></button>}
            </section>;
          }) : <div className="routes-design-empty" role="status"><h3>Chưa tìm thấy tuyến phù hợp</h3><p>Thử tìm tên tỉnh, thành phố hoặc điểm đến khác.</p><button type="button" onClick={() => { setDestinationQuery(""); setFilters(emptyFilters); }}>Xem tất cả tuyến</button></div>}</div>
        </div>
      </section>
      <section className="home-steps routes-design-steps" aria-labelledby="route-steps-title"><h2 id="route-steps-title">Các bước đặt xe đơn giản</h2><div className="home-steps-grid">
        <div className="home-step"><span className="home-step-number">1</span><Search /><div><strong>Chọn tuyến</strong><p>Tìm tuyến đường phù hợp với nhu cầu của bạn.</p></div></div>
        <div className="home-step"><span className="home-step-number">2</span><CarFront /><div><strong>Chọn xe</strong><p>Chọn loại xe phù hợp với số lượng hành khách.</p></div></div>
        <div className="home-step"><span className="home-step-number">3</span><CalendarDays /><div><strong>Xác nhận lịch và giá</strong><p>Kiểm tra thông tin và xác nhận đặt xe dễ dàng.</p></div></div>
      </div></section>
      <section className="home-contact routes-design-contact" aria-labelledby="route-contact-title"><div><h2 id="route-contact-title">Chưa thấy tuyến bạn cần?</h2><p>Liên hệ ngay để được tư vấn tuyến đường phù hợp nhất.</p></div><div className="home-contact-actions">
        {zaloLink && <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="home-button home-button-primary zalo-cta"><ZaloIcon /> Nhắn Zalo tư vấn <ArrowRight size={16} /></a>}
        <a href={`tel:${SITE_HOTLINE_TEL}`} className="home-button home-button-outline"><Phone size={18} /> Gọi {SITE_HOTLINE}</a>
      </div></section>
    </div>
    <SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "Khám phá", links: [{ label: "Trang chủ", href: "/" }, { label: "Tuyến xe", href: "/tuyen-duong" }, { label: "Loại xe", href: "/loai-xe" }] }, { title: "Hỗ trợ", links: [{ label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}
