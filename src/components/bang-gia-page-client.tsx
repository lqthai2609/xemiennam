"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowRightLeft, CalendarDays, CarFront, CheckCircle2, ChevronDown, ChevronRight, FileText, Info, MapPin, MessageCircle, Phone, RefreshCw, Search, Tag, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { VEHICLE_TYPE_ORDER } from "@/lib/api/routes";
import { routeHref, routeComboHref, vehicleTypeSlug, type Route, type RoutePricingPackage, type VehiclePrice } from "@/types/route";
import { getPublicLocationLabel, getPublicRouteLocations } from "@/lib/public-location-label";
import { locationMatchesQuery } from "@/lib/location-search";
import { formatVNDate } from "@/lib/wp";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

const featuredRegions = ["ba-ria-vung-tau", "dong-nai", "tay-ninh", "can-tho", "binh-thuan"];
const localRegionImages = new Set(["ba-ria-vung-tau", "dong-nai", "tay-ninh", "can-tho", "ben-tre", "phan-thiet", "binh-duong", "binh-phuoc", "long-an", "my-tho", "chau-doc", "da-lat", "ho-chi-minh"]);
type TripType = "one_way" | "round_trip_day" | "2d1n";

function priceFor(route: Route, type: string, tripType: TripType): RoutePricingPackage | VehiclePrice | undefined {
  if (route.pricingV2) {
    if (!route.pricingV2.outbound.enabled) return undefined;
    return route.pricingV2.outbound.packages.find((item) => item.vehicleType === type && item.packageKey === tripType && item.mode !== "disabled");
  }
  return tripType === "one_way" ? route.pricingByVehicle.find((item) => item.vehicleType === type) : undefined;
}

function priceText(price: RoutePricingPackage | VehiclePrice | undefined) {
  if (!price) return "—";
  if ("mode" in price) return price.mode === "fixed" ? price.priceLabel || (price.price ? `${Math.round(price.price / 1000).toLocaleString("vi-VN")}K` : "Liên hệ báo giá") : "Liên hệ báo giá";
  return price.pricingMode === "contact" ? "Liên hệ báo giá" : price.price || "Liên hệ báo giá";
}

function isFixed(price: RoutePricingPackage | VehiclePrice | undefined) {
  return Boolean(price && ("mode" in price ? price.mode === "fixed" : price.pricingMode !== "contact"));
}

function destinationImage(route: Route) {
  if (route.featuredImage) return route.featuredImage;
  return localRegionImages.has(route.regionSlug) ? `/images/destinations/${route.regionSlug}.webp` : "/images/home-coastal-fleet.webp";
}

export function BangGiaPageClient({ routes, lastModified }: { routes: Route[]; lastModified?: string }) {
  const origins = useMemo(() => Array.from(new Set(routes.map((route) => route.from))).sort((a, b) => getPublicLocationLabel(a).localeCompare(getPublicLocationLabel(b), "vi")), [routes]);
  const [origin, setOrigin] = useState(() => origins.find((item) => getPublicLocationLabel(item) === "Sài Gòn") || origins[0] || "");
  const [region, setRegion] = useState(() => routes.some((route) => route.regionSlug === featuredRegions[0]) ? featuredRegions[0] : routes[0]?.regionSlug || "");
  const [tripType, setTripType] = useState<TripType>("one_way");
  const [query, setQuery] = useState("");
  const railRef = useRef<HTMLDivElement>(null);
  const zaloLink = getZaloChatLink();

  const originRoutes = useMemo(() => routes.filter((route) => route.from === origin), [routes, origin]);
  const regions = useMemo(() => {
    const grouped = new Map<string, string>();
    originRoutes.forEach((route) => { if (!grouped.has(route.regionSlug)) grouped.set(route.regionSlug, route.region); });
    return [...grouped].sort(([a, nameA], [b, nameB]) => {
      const rankA = featuredRegions.indexOf(a), rankB = featuredRegions.indexOf(b);
      return (rankA < 0 ? featuredRegions.length : rankA) - (rankB < 0 ? featuredRegions.length : rankB) || nameA.localeCompare(nameB, "vi");
    });
  }, [originRoutes]);
  const selectedRegion = regions.some(([slug]) => slug === region) ? region : regions[0]?.[0] || "";
  const filteredRoutes = useMemo(() => originRoutes.filter((route) => route.regionSlug === selectedRegion && (!query.trim() || locationMatchesQuery(route.to, query.trim()))), [originRoutes, selectedRegion, query]);
  const columns = useMemo(() => ["4 chỗ", "7 chỗ", "16 chỗ", ...VEHICLE_TYPE_ORDER.filter((type) => !["4 chỗ", "7 chỗ", "16 chỗ"].includes(type))].filter((type) => originRoutes.some((route) => route.vehicleTypes.includes(type))).slice(0, 3), [originRoutes]);
  const tripLabel = tripType === "one_way" ? "Một chiều" : tripType === "round_trip_day" ? "Khứ hồi trong ngày" : "2 ngày 1 đêm";

  function selectOrigin(value: string) { setOrigin(value); setQuery(""); }
  function resetSearch() { setQuery(""); }

  return <main className="site-shell home-redesign pricing-redesign">
    <SiteHeader menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Bảng giá", "Liên hệ"].includes(item.label))} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink || "/lien-he"} homeDesign />
    <section className="pricing-hero" aria-labelledby="pricing-title"><div className="pricing-width pricing-hero-inner"><p className="home-eyebrow">BẢNG GIÁ</p><h1 id="pricing-title">Bảng giá xe riêng<br />theo điểm đến</h1><p>Chọn tỉnh thành, tìm địa điểm và xem giá theo loại xe.</p></div></section>

    <div className="pricing-width pricing-main">
      <section className="pricing-filter" aria-label="Lọc bảng giá">
        <div className="pricing-filter-top"><label className="pricing-origin"><MapPin size={24} aria-hidden="true" /><span><span>Điểm đón</span><select value={origin} onChange={(event) => selectOrigin(event.target.value)} aria-label="Chọn điểm đón">{origins.map((item) => <option key={item} value={item}>{getPublicLocationLabel(item)}</option>)}</select></span><ChevronDown size={17} aria-hidden="true" /></label>
          <div className="pricing-trip-tabs" role="group" aria-label="Loại chuyến"><button type="button" className={tripType === "one_way" ? "active" : ""} aria-pressed={tripType === "one_way"} onClick={() => setTripType("one_way")}><ArrowRightLeft aria-hidden="true" />Một chiều</button><button type="button" className={tripType === "round_trip_day" ? "active" : ""} aria-pressed={tripType === "round_trip_day"} onClick={() => setTripType("round_trip_day")}><RefreshCw aria-hidden="true" />Khứ hồi</button><button type="button" className={tripType === "2d1n" ? "active" : ""} aria-pressed={tripType === "2d1n"} onClick={() => setTripType("2d1n")}><CalendarDays aria-hidden="true" />Theo ngày</button></div>
        </div>
        <h2>Chọn tỉnh thành</h2><div className="pricing-region-row"><div className="pricing-region-rail" ref={railRef}>{regions.map(([slug, name]) => <button type="button" key={slug} className={slug === selectedRegion ? "active" : ""} aria-pressed={slug === selectedRegion} onClick={() => { setRegion(slug); resetSearch(); }}>{slug === selectedRegion && <MapPin size={19} aria-hidden="true" />}{getPublicLocationLabel(name)}</button>)}</div><button type="button" className="pricing-rail-next" aria-label="Xem thêm tỉnh thành" onClick={() => railRef.current?.scrollBy({ left: 270, behavior: "smooth" })}><span>Xem thêm</span><ChevronRight aria-hidden="true" /></button></div>
        <label className="pricing-search"><Search size={23} aria-hidden="true" /><span className="sr-only">Tìm địa điểm trong tỉnh</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhanh địa điểm trong tỉnh, ví dụ: Hồ Tràm" /><span className="pricing-result-count">{filteredRoutes.length} điểm đến</span>{query && <button type="button" onClick={resetSearch} aria-label="Xóa tìm kiếm"><X size={16} /></button>}</label>
      </section>

      <section className="pricing-results" aria-label={`Giá xe ${tripLabel.toLowerCase()} theo điểm đến`}>
        <div className="pricing-table-scroll"><table className="pricing-table"><thead><tr><th scope="col">ĐIỂM ĐẾN <span className="pricing-desktop-only">/ TUYẾN</span></th>{columns.map((type) => <th key={type} scope="col"><CarFront size={29} aria-hidden="true" /> XE {type.toUpperCase()}</th>)}<th scope="col" className="pricing-route-column">XEM TUYẾN</th></tr></thead><tbody>{filteredRoutes.map((route) => { const { from, to } = getPublicRouteLocations(route); return <tr key={route.slug}><td className="pricing-destination-cell"><Link href={routeHref(route)} className="pricing-place"><span className="pricing-place-image"><Image src={destinationImage(route)} alt="" fill sizes="(max-width: 700px) 70px, 95px" /></span><span><strong>{to}</strong><small>{from} đi {to}</small></span></Link></td>{columns.map((type) => { const price = priceFor(route, type, tripType); const label = priceText(price); return <td key={type}><div className="pricing-price-cell">{price && isFixed(price) && <small>Giá chỉ</small>}{price ? <Link href={`${routeComboHref(route, vehicleTypeSlug(type))}?package=${tripType}#pricing`} className={isFixed(price) ? "pricing-fixed" : "pricing-contact-price"} title={`Xem xe ${type} tuyến ${from} đi ${to}`}>{label}</Link> : <span className="pricing-unavailable">{label}</span>}<small>{tripLabel} / chuyến</small></div></td>; })}<td className="pricing-route-column"><Link href={routeHref(route)} className="pricing-view-route">Xem tuyến <ArrowRight size={16} aria-hidden="true" /></Link></td></tr>; })}</tbody></table>{!filteredRoutes.length && <p className="pricing-empty">Chưa tìm thấy điểm đến phù hợp. Hãy thử một tỉnh hoặc từ khóa khác.</p>}</div>
        <p className="pricing-mobile-hint"><span>☝</span> Chạm tên điểm đến để xem tuyến <ArrowRight size={20} aria-hidden="true" /></p>
      </section>
      <p className="pricing-note"><Info size={21} aria-hidden="true" /><span>Giá áp dụng cho tuyến, loại xe và gói dịch vụ bạn chọn. Giá cuối cùng sẽ được xác nhận trước khi khởi hành.{lastModified && <> Cập nhật {formatVNDate(lastModified)}.</>}</span></p>

      <section className="pricing-guide" aria-labelledby="pricing-guide-title"><h2 id="pricing-guide-title">Cách đọc bảng giá</h2><div className="pricing-guide-grid"><div><span><Tag aria-hidden="true" /></span><p><strong>Giá chỉ</strong><small>Là mức giá tham khảo cho một chiều di chuyển, áp dụng đúng tuyến đường và loại xe hiển thị.</small></p></div><div><span><FileText aria-hidden="true" /></span><p><strong>Liên hệ báo giá</strong><small>Một số tuyến hoặc loại xe cần tư vấn thêm để có giá phù hợp với thời gian, nhu cầu và lịch trình của bạn.</small></p></div><div><span><CheckCircle2 aria-hidden="true" /></span><p><strong>Xác nhận chuyến</strong><small>Giá cuối cùng, thời gian đón và các chi tiết dịch vụ sẽ được xác nhận trước khi khởi hành.</small></p></div></div></section>
      <section className="pricing-contact" aria-labelledby="pricing-contact-title"><div className="pricing-contact-copy"><h2 id="pricing-contact-title">Không thấy điểm đến hoặc giá phù hợp?</h2><p>Hãy gửi yêu cầu hoặc liên hệ với chúng tôi để được tư vấn lịch trình và báo giá phù hợp.</p></div><div className="pricing-contact-actions">{zaloLink && <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="home-button home-button-primary"><MessageCircle size={20} aria-hidden="true" /> Nhắn Zalo để được tư vấn <ArrowRight size={17} aria-hidden="true" /></a>}<div><Link href="/lien-he" className="home-button home-button-outline"><FileText size={20} aria-hidden="true" /> Gửi yêu cầu</Link><a href={`tel:${SITE_HOTLINE_TEL}`} className="home-button home-button-outline"><Phone size={20} aria-hidden="true" /> {SITE_HOTLINE}</a></div></div></section>
    </div>
    <SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "Khám phá", links: [{ label: "Trang chủ", href: "/" }, { label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Điểm đến", href: "/diem-den" }, { label: "Loại xe", href: "/loai-xe" }, { label: "Bảng giá", href: "/bang-gia" }] }, { title: "Hỗ trợ", links: [{ label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" }, { label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}
