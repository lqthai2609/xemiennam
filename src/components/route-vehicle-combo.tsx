"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowRightLeft, CalendarDays, CarFront, Clock3, FileText, Info, MapPin, MessageCircle, Navigation, Phone, Route as RouteIcon, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RouteBookingActions, type AirportBookingContext } from "@/components/route-booking-actions";
import { availablePackages, findVehiclePackage, type JourneyPackage } from "@/lib/route-package-capability";
import { findComboVehiclePriceForDirection } from "@/lib/combo";
import { reverseRouteMapEmbedSrc } from "@/lib/maps";
import { formatPriceShort } from "@/lib/wp";
import { navItems } from "@/data/nav";
import { routeComboHref, type Route, type RoutePricingDirectionKey, type VehiclePrice } from "@/types/route";
import type { VehicleCategory } from "@/types/vehicle-category";
import type { Vehicle } from "@/types/vehicle";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { getPublicLocationLabel, getPublicRouteLabel } from "@/lib/public-location-label";
import { getZaloChatLink } from "@/lib/zalo";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";

const packageLabels: Record<JourneyPackage, string> = { oneWay: "Một chiều", roundTrip: "Khứ hồi", twoDays: "2 ngày 1 đêm", threeDays: "3 ngày 2 đêm" };
const passengerLabels: Record<string, string> = { "4 chỗ": "1–3 hành khách", "7 chỗ": "3–6 hành khách", "16 chỗ": "7–14 hành khách", "29 chỗ": "Nhóm và đoàn", "45 chỗ": "Đoàn lớn", Limousine: "Không gian cao cấp" };

function SimilarRouteCard({ route, vehicleSlug }: { route: Route; vehicleSlug: string }) {
  return <Link className="combo-design-related-card" href={routeComboHref(route, vehicleSlug)}>
    <span className="combo-design-related-image"><Image src={route.featuredImage || "/images/destinations/ba-ria-vung-tau.webp"} alt="" fill sizes="(max-width: 800px) 45vw, 33vw" /></span>
    <strong>{getPublicLocationLabel(route.from)} đi {getPublicLocationLabel(route.to)}</strong><span className="combo-design-related-arrow"><ArrowRight size={16} aria-hidden="true" /></span>
  </Link>;
}

export function ComboLandingPage({ route, vehiclePrice, category, similarRoutes, vehicle }: { route: Route; vehiclePrice: VehiclePrice; category: VehicleCategory; similarRoutes: Route[]; vehicle?: Vehicle }) {
  const [direction, setDirection] = useState<RoutePricingDirectionKey>("outbound");
  const [journey, setJourney] = useState<"oneWay" | "roundTrip" | "twoDays">("oneWay");
  const [days, setDays] = useState<"twoDays" | "threeDays">("twoDays");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("direction");
    if (requested !== "inbound" || !findComboVehiclePriceForDirection(route, category.slug, "inbound")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDirection("inbound");
  }, [category.slug, route]);

  const prelaunch = isPrelaunchAirportRoute(route);
  const inboundAvailable = Boolean(findComboVehiclePriceForDirection(route, category.slug, "inbound"));
  const inbound = direction === "inbound" && inboundAvailable;
  const activeDirection: RoutePricingDirectionKey = inbound ? "inbound" : "outbound";
  const from = getPublicLocationLabel(inbound ? route.to : route.from);
  const to = getPublicLocationLabel(inbound ? route.from : route.to);
  const displayRoute = `${from} – ${to}`;
  const rows = route.pricingV2?.[activeDirection]?.packages.filter((item) => item.vehicleType === category.type) || [];
  const available = availablePackages(rows);
  const journeyTabs = (["oneWay", "roundTrip", "twoDays"] as const).filter((item) => item === "twoDays" ? available.includes("twoDays") || available.includes("threeDays") : available.includes(item));
  const visibleJourney = journeyTabs.includes(journey) ? journey : journeyTabs[0];
  const visibleDays = available.includes(days) ? days : available.includes("twoDays") ? "twoDays" : "threeDays";
  const selectedPackage = visibleJourney === "twoDays" ? visibleDays : visibleJourney;
  const selectedRow = selectedPackage ? findVehiclePackage(rows, category.type, selectedPackage) : undefined;
  const legacyPrice = findComboVehiclePriceForDirection(route, category.slug, activeDirection) || vehiclePrice;
  const hasFixedPrice = selectedRow ? selectedRow.mode === "fixed" && typeof selectedRow.price === "number" && selectedRow.price > 0 : legacyPrice.pricingMode === "fixed" && typeof legacyPrice.numericPrice === "number" && legacyPrice.numericPrice > 0;
  const priceLabel = selectedRow ? hasFixedPrice ? selectedRow.priceLabel || formatPriceShort(selectedRow.price!) : "Liên hệ báo giá" : hasFixedPrice ? legacyPrice.price : "Liên hệ báo giá";
  const packageLabel = selectedRow?.packageLabel || legacyPrice.packageLabel || "Một chiều";
  const packageKey = selectedRow?.packageKey || legacyPrice.packageKey;
  const image = vehicle?.images[0] || category.imageUrl;
  const heroImage = route.regionSlug === "ba-ria-vung-tau" ? "/images/home-coastal-fleet.webp" : route.featuredImage || "/images/home-coastal-fleet.webp";
  const mapSrc = inbound ? reverseRouteMapEmbedSrc(route.mapEmbedSrc, from, to) : route.mapEmbedSrc;
  const passengerLabel = passengerLabels[category.type] || vehicle?.capacity || "Đi theo nhóm";
  const zaloLink = getZaloChatLink();
  const pickupLocation = inbound ? route.destinationLocation : route.originLocation;
  const dropoffLocation = inbound ? route.originLocation : route.destinationLocation;
  const airportContext: AirportBookingContext | undefined = pickupLocation?.type === "airport" ? "pickup_from_airport" : dropoffLocation?.type === "airport" ? "dropoff_at_airport" : undefined;
  const airportName = airportContext === "pickup_from_airport" ? getPublicLocationLabel(pickupLocation) : airportContext === "dropoff_at_airport" ? getPublicLocationLabel(dropoffLocation) : undefined;
  const bookingProps = { route: getPublicRouteLabel(route, " – "), routeId: route.id, displayRoute, vehicleType: category.type, price: hasFixedPrice ? priceLabel : undefined, direction: activeDirection, packageKey, packageLabel, pricingMode: hasFixedPrice ? "fixed" as const : "contact" as const, airportContext, airportName };

  return <main className="site-shell home-redesign combo-redesign">
    <SiteHeader menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Blog", "Liên hệ"].includes(item.label))} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink || "/lien-he"} homeDesign />
    <section className="combo-design-hero" aria-labelledby="combo-title"><Image src={heroImage} alt="" fill priority sizes="100vw" className="combo-design-hero-image" /><div className="combo-design-width combo-design-hero-inner">
      <nav className="combo-design-breadcrumb" aria-label="Đường dẫn"><Link href="/tuyen-duong">Tuyến đường</Link><span>/</span><Link href={`/tuyen-duong/${route.regionSlug}`}>{getPublicLocationLabel(route.region)}</Link><span>/</span><span>Xe {category.type}</span></nav>
      <p className="home-eyebrow">{prelaunch ? "TUYẾN ĐANG CHUẨN BỊ" : "XE RIÊNG CÓ TÀI XẾ"}</p><h1 id="combo-title">Xe {category.type}<br />{from} đi {to}</h1>
      <p className="combo-design-hero-description">Xe riêng có tài xế, chủ động lịch trình, phù hợp {passengerLabel.toLowerCase()}.</p>
      <div className="combo-design-hero-chips"><span><CarFront aria-hidden="true" /><strong>Xe {category.type}<small>Riêng tư, thoải mái</small></strong></span><span><UsersRound aria-hidden="true" /><strong>{passengerLabel}<small>Phù hợp lịch trình của bạn</small></strong></span></div>
      {zaloLink && <a className="home-button home-button-primary combo-design-hero-cta" href={zaloLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} aria-hidden="true" />{prelaunch ? "Nhắn Zalo tư vấn" : "Nhắn Zalo đặt xe"}<ArrowRight size={17} aria-hidden="true" /></a>}
    </div></section>

    <div className="combo-design-width"><section className="combo-design-booking" id="booking" aria-label="Chọn gói hành trình và đặt xe">
      {journeyTabs.length > 0 && <div className="combo-design-tabs" role="tablist" aria-label="Chọn loại hành trình">{([{key:"oneWay",label:"Một chiều",icon:ArrowRight},{key:"roundTrip",label:"Khứ hồi",icon:ArrowRightLeft},{key:"twoDays",label:"Theo ngày",icon:CalendarDays}] as const).filter((item) => journeyTabs.includes(item.key)).map((item) => <button type="button" role="tab" aria-selected={visibleJourney === item.key} className={visibleJourney === item.key ? "is-selected" : ""} key={item.key} onClick={() => setJourney(item.key)}><item.icon aria-hidden="true" size={19} />{item.label}</button>)}</div>}
      {visibleJourney === "twoDays" && <div className="combo-design-days" role="group" aria-label="Gói theo ngày">{(["twoDays","threeDays"] as const).filter((item) => available.includes(item)).map((item) => <button type="button" aria-pressed={visibleDays === item} className={visibleDays === item ? "is-selected" : ""} key={item} onClick={() => setDays(item)}>{packageLabels[item]}</button>)}</div>}
      {inboundAvailable && <div className="combo-design-directions" role="group" aria-label="Chọn chiều đi"><button type="button" aria-pressed={!inbound} className={!inbound ? "is-selected" : ""} onClick={() => setDirection("outbound")}><span aria-hidden="true" />{getPublicLocationLabel(route.from)} đi {getPublicLocationLabel(route.to)}</button><button type="button" aria-pressed={inbound} className={inbound ? "is-selected" : ""} onClick={() => setDirection("inbound")}><span aria-hidden="true" />{getPublicLocationLabel(route.to)} đi {getPublicLocationLabel(route.from)}</button></div>}
      <div className="combo-design-offer"><div className="combo-design-offer-vehicle"><span><CarFront aria-hidden="true" /></span><p><strong>Xe {category.type}</strong><small>{from} đi {to}</small></p></div><div className="combo-design-offer-price"><small>{prelaunch ? "Trạng thái" : hasFixedPrice ? "Giá chỉ" : "Giá xe"}</small><strong className={hasFixedPrice && !prelaunch ? "is-fixed" : ""}>{prelaunch ? "Đang chuẩn bị" : priceLabel}</strong><span>{prelaunch ? "Chưa nhận đặt chuyến" : hasFixedPrice ? `${packageLabel} / chuyến` : "Xác nhận theo lịch thực tế"}</span></div><div className="combo-design-offer-actions">{prelaunch ? <a className="home-button home-button-primary" href="/lien-he">Liên hệ tư vấn</a> : <RouteBookingActions {...bookingProps} />}</div><p className="combo-design-offer-note"><Info size={17} aria-hidden="true" />{prelaunch ? "Liên hệ để được tư vấn; tuyến chưa nhận đặt chuyến." : "Giá và lịch xe được xác nhận trước khi nhận chuyến."}</p></div>
    </section>

    <section className="combo-design-section combo-design-fit" aria-labelledby="combo-fit-title"><div className="combo-design-heading"><h2 id="combo-fit-title">Xe phù hợp với chuyến đi</h2><p>Xe riêng {category.type}, thoải mái và linh hoạt cho hành trình {displayRoute}.</p></div><div className="combo-design-fit-grid"><div className="combo-design-fit-image">{image ? <Image src={image} alt={`Xe ${category.type}`} fill sizes="(max-width: 800px) 100vw, 50vw" /> : <CarFront size={70} aria-hidden="true" />}</div><div className="combo-design-fit-facts"><div><span><UsersRound /></span><p><strong>Xe riêng có tài xế</strong><small>Tài xế hỗ trợ suốt hành trình.</small></p></div><div><span><UsersRound /></span><p><strong>Phù hợp {passengerLabel.toLowerCase()}</strong><small>Không gian riêng cho gia đình hoặc nhóm bạn.</small></p></div><div><span><MapPin /></span><p><strong>Điểm đón và trả xác nhận khi đặt</strong><small>Linh hoạt theo nhu cầu của bạn.</small></p></div><p className="combo-design-fit-note"><Info size={16} />Dòng xe thực tế được xác nhận khi tư vấn.</p></div></div></section>

    <section className="combo-design-section combo-design-journey" aria-labelledby="combo-journey-title"><div className="combo-design-heading"><h2 id="combo-journey-title">Thông tin hành trình</h2><p>Hành trình từ {from} đến {to} với xe riêng, linh hoạt theo nhu cầu của bạn.</p></div><div className="combo-design-map">{mapSrc && !prelaunch ? <iframe src={mapSrc} title={`Bản đồ hành trình ${displayRoute}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div><RouteIcon size={39} /><strong>{displayRoute}</strong><small>Bản đồ hành trình đang cập nhật</small></div>}</div><div className="combo-design-journey-facts"><div><MapPin /><p><strong>Điểm đón theo yêu cầu</strong><small>Đón tại nhà, văn phòng hoặc địa điểm phù hợp.</small></p></div><div><Navigation /><p><strong>Lộ trình xác nhận khi tư vấn</strong><small>Lộ trình phù hợp, linh hoạt theo tình hình thực tế.</small></p></div><div><Clock3 /><p><strong>Thời gian tùy tình hình giao thông</strong><small>Thời gian di chuyển sẽ được tư vấn cụ thể khi đặt xe.</small></p></div></div></section>
    </div>

    <section className="combo-design-benefits"><div className="combo-design-width"><div className="combo-design-heading"><h2>Đi xe riêng, chủ động lịch trình</h2><p>Giải pháp di chuyển linh hoạt, phù hợp cho gia đình, nhóm bạn hoặc công tác.</p></div><div className="combo-design-benefit-grid"><div><span><UsersRound /></span><p><strong>Xe riêng có tài xế</strong><small>Thoải mái, riêng tư, hỗ trợ suốt hành trình.</small></p></div><div><span><Clock3 /></span><p><strong>Chọn thời gian đón</strong><small>Linh hoạt theo lịch trình của bạn.</small></p></div><div><span><FileText /></span><p><strong>Xác nhận giá trước chuyến đi</strong><small>An tâm chủ động kế hoạch và chi phí.</small></p></div></div></div></section>

    <div className="combo-design-width combo-design-lower"><section className="combo-design-faq" aria-labelledby="combo-faq-title"><div className="combo-design-heading"><h2 id="combo-faq-title">Câu hỏi thường gặp</h2><p>Một số thắc mắc phổ biến khi đặt xe đi {to}.</p></div><details><summary>{hasFixedPrice && !prelaunch ? `Giá ${priceLabel} áp dụng cho chuyến nào?` : "Giá chuyến đi được xác nhận thế nào?"}</summary><p>{hasFixedPrice && !prelaunch ? `Giá hiển thị cho xe ${category.type}, chiều ${displayRoute}, gói ${packageLabel}. Điểm đón và điều kiện chuyến được xác nhận khi đặt.` : "Tổ hợp đang chọn cần báo giá theo lịch thực tế. Vui lòng liên hệ để được xác nhận chi phí."}</p></details><details><summary>Có thể đặt khứ hồi không?</summary><p>{available.includes("roundTrip") ? "Có. Chọn tab Khứ hồi ở phần đặt xe để xem giá hoặc yêu cầu báo giá đúng gói." : "Vui lòng liên hệ để được tư vấn chuyến về theo lịch xe thực tế."}</p></details><details><summary>Điểm đón và trả được xác nhận thế nào?</summary><p>Gửi địa điểm và thời gian mong muốn khi đặt xe. Nhân viên sẽ xác nhận điểm đón, điểm trả và điều kiện chuyến trước khi nhận chuyến.</p></details></section>
      {similarRoutes.length > 0 && <section className="combo-design-related" aria-labelledby="combo-related-title"><div className="combo-design-heading"><h2 id="combo-related-title">Khám phá tuyến gần {getPublicLocationLabel(route.to)}</h2><p>Các tuyến đường phù hợp khác từ {getPublicLocationLabel(route.from)} cho du lịch và nghỉ dưỡng.</p></div><div className="combo-design-related-grid">{similarRoutes.map((item) => <SimilarRouteCard key={item.id} route={item} vehicleSlug={category.slug} />)}</div></section>}
      <section className="combo-design-contact" aria-labelledby="combo-contact-title"><div><h2 id="combo-contact-title">{prelaunch ? `Cần tư vấn tuyến ${to}?` : `Sẵn sàng đi ${to}?`}</h2><p>{prelaunch ? "Liên hệ tư vấn; tuyến chưa nhận đặt chuyến." : "Liên hệ ngay để được tư vấn lịch trình và xác nhận giá."}</p></div><div className="combo-design-contact-actions">{zaloLink && <a className="home-button home-button-primary" href={zaloLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />{prelaunch ? "Nhắn Zalo tư vấn" : "Nhắn Zalo đặt xe"}<ArrowRight size={16} /></a>}{!prelaunch && <a className="home-button home-button-outline" href="#booking"><FileText size={17} />Gửi yêu cầu đặt xe</a>}<a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={17} />Gọi {SITE_HOTLINE}</a></div></section>
    </div>

    <SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{title:"Khám phá",links:[{label:"Trang chủ",href:"/"},{label:"Tuyến đường",href:"/tuyen-duong"},{label:"Loại xe",href:"/loai-xe"}]},{title:"Hỗ trợ",links:[{label:"Liên hệ",href:"/lien-he"}]}]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}

export default ComboLandingPage;
