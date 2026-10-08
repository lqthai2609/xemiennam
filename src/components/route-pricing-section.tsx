"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowRightLeft, BusFront, CalendarDays, MapPin, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MediaPhoto } from "@/components/media-photo";
import { RouteBookingActions, type AirportBookingContext } from "@/components/route-booking-actions";
import { getPublicLocationLabel, getPublicRouteLabel } from "@/lib/public-location-label";
import { availablePackages, findVehiclePackage, type JourneyPackage } from "@/lib/route-package-capability";
import { routeJourneyHref } from "@/lib/route-journey-selection";
import {
  priceTypeLabel,
  routeComboHref,
  vehicleTypeSlug,
  type Route,
  type RoutePricingDirectionKey,
} from "@/types/route";

function LegacyPricingGrid({
  route,
  vehicleImageByType,
}: {
  route: Route;
  vehicleImageByType: Record<string, string>;
}) {
  const routeLabel = getPublicRouteLabel(route, " – ");
  return (
    <div className="detail-price-grid">
      {route.pricingByVehicle.map((vp) => (
        <article className="detail-price-card" key={vp.vehicleType}>
          <Link href={routeComboHref(route, vehicleTypeSlug(vp.vehicleType))} className="detail-price-media" aria-label={`Xem tuyến ${routeLabel} bằng ${vp.vehicleType}`}>
            {vehicleImageByType[vp.vehicleType] ? (
              <MediaPhoto
                src={vehicleImageByType[vp.vehicleType]}
                alt={vp.vehicleType}
                sizes="(max-width: 540px) 100vw, (max-width: 800px) 50vw, (max-width: 1180px) 35vw, 320px"
              />
            ) : (
              <BusFront size={32} strokeWidth={1.4} />
            )}
          </Link>
          <Link href={routeComboHref(route, vehicleTypeSlug(vp.vehicleType))} className="vehicle-chip">
            {vp.vehicleType}
          </Link>
          <strong>{vp.price}</strong>
          <small>{priceTypeLabel(vp.priceType)} · Giá tham khảo</small>
          <Button size="sm" variant="outline" asChild>
            <Link href={routeComboHref(route, vehicleTypeSlug(vp.vehicleType))}>
              Thuê xe {vp.vehicleType} đi {getPublicLocationLabel(route.to)} <ArrowRight size={15} />
            </Link>
          </Button>
          <RouteBookingActions route={routeLabel} routeId={route.id} vehicleType={vp.vehicleType} price={vp.price} pricingMode={vp.pricingMode === "contact" ? "contact" : "fixed"} />
        </article>
      ))}
    </div>
  );
}

const vehicleCards = [
  { type: "Xe 4 chỗ", models: "Toyota Vios · Hyundai Accent · Honda City · Kia Cerato", capacity: "1–3 hành khách", benefits: ["Xe riêng có tài xế", "Xác nhận điểm đón khi báo giá", "Xác nhận điểm trả khi báo giá"], popular: false, fallback: "/images/hero-dat-xe-sai-gon.webp" },
  { type: "Xe 7 chỗ", models: "Mitsubishi Xpander · Toyota Innova · Toyota Fortuner", capacity: "3–6 hành khách", benefits: ["Xe riêng có tài xế", "Hành lý thoải mái", "Xác nhận điểm đón khi báo giá"], popular: true, fallback: "/images/destinations/ba-ria-vung-tau.webp" },
  { type: "Xe 16 chỗ", models: "Ford Transit · Hyundai Solati", capacity: "7–14 hành khách", benefits: ["Phù hợp nhóm đông", "Có tài xế", "Xác nhận điểm đón/trả khi báo giá"], popular: false, fallback: "/images/destinations/ho-chi-minh.webp" },
  { type: "Xe 29 chỗ", models: "Thaco / Hyundai hoặc tương đương", capacity: "Nhóm / đoàn", benefits: ["Phù hợp đoàn đông", "Có tài xế", "Phục vụ theo lịch"], popular: false, fallback: "/images/destinations/long-an.webp" },
  { type: "Xe 45 chỗ", models: "Universe / Samco hoặc tương đương", capacity: "Đoàn lớn", benefits: ["Không gian rộng", "Có tài xế", "Phục vụ theo lịch"], popular: false, fallback: "/images/destinations/ben-tre.webp" },
  { type: "Limousine", models: "Dòng limousine cao cấp", capacity: "Không gian cao cấp", benefits: ["Nội thất cao cấp", "Tiện nghi", "Phù hợp khách VIP / doanh nghiệp"], popular: false, fallback: "/images/services/city-tour.png" },
] as const;

const packageLabels: Record<JourneyPackage, string> = { oneWay: "Một chiều", roundTrip: "Khứ hồi", twoDays: "2 ngày 1 đêm", threeDays: "3 ngày 2 đêm" };

export function RoutePricingSection({ route, direction, onDirectionChange, journey, onJourneyChange, vehicleImageByType = {}, prelaunch = false, redesign = false, hero }: { route: Route; direction: RoutePricingDirectionKey; onDirectionChange: (direction: RoutePricingDirectionKey) => void; journey: JourneyPackage; onJourneyChange: (journey: JourneyPackage) => void; vehicleImageByType?: Record<string, string>; prelaunch?: boolean; redesign?: boolean; hero?: ReactNode }) {
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const pricing = route.pricingV2;
  const activeDirection = pricing?.[direction]?.enabled ? direction : pricing?.outbound.enabled ? "outbound" : "inbound";
  const active = activeDirection ? pricing?.[activeDirection] : undefined;
  const canonicalRoute = getPublicRouteLabel(route, " – ");
  const displayRoute = activeDirection === "outbound" ? canonicalRoute : `${getPublicLocationLabel(route.to)} – ${getPublicLocationLabel(route.from)}`;
  const pickupLocation = activeDirection === "outbound" ? route.originLocation : route.destinationLocation;
  const dropoffLocation = activeDirection === "outbound" ? route.destinationLocation : route.originLocation;
  const airportContext: AirportBookingContext | undefined = pickupLocation?.type === "airport" ? "pickup_from_airport" : dropoffLocation?.type === "airport" ? "dropoff_at_airport" : undefined;
  const rows = active?.packages ?? [];
  const available = availablePackages(rows);
  const availableJourneys = (["oneWay", "roundTrip", "twoDays"] as const).filter((item) =>
    item === "twoDays" ? available.includes("twoDays") || available.includes("threeDays") : available.includes(item),
  );
  const requestedJourney = journey === "threeDays" ? "twoDays" : journey;
  const visibleJourney = availableJourneys.includes(requestedJourney) ? requestedJourney : availableJourneys[0];
  const visibleDays = journey === "threeDays" && available.includes("threeDays") ? "threeDays" : available.includes("twoDays") ? "twoDays" : "threeDays";
  const selectedPackage = visibleJourney === "twoDays" ? visibleDays : visibleJourney;
  const hasTravelTime = Boolean(route.time.trim() && route.time.trim() !== "0");
  const hasDistance = Boolean(route.distance.trim() && route.distance.trim() !== "0 km");
  const visibleVehicles = selectedPackage
    ? vehicleCards.flatMap((vehicle) => {
        const pkg = findVehiclePackage(rows, vehicle.type, selectedPackage);
        return pkg && pkg.mode !== "disabled" ? [{ vehicle, pkg }] : [];
      })
    : [];
  const orderedVehicles = redesign
    ? [...visibleVehicles].sort((a, b) => Number(b.vehicle.popular) - Number(a.vehicle.popular))
    : visibleVehicles;
  const displayedVehicles = redesign && !showAllVehicles ? orderedVehicles.slice(0, 3) : orderedVehicles;

  const legacy = prelaunch
    ? <p>Đang chuẩn bị tuyến. <a href="/lien-he">Liên hệ tư vấn</a>; chưa nhận đặt chuyến.</p>
    : <LegacyPricingGrid route={route} vehicleImageByType={vehicleImageByType} />;
  const journeyControls = <>
    {availableJourneys.length > 0 ? <div className="route-direction-tabs" role="tablist" aria-label="Chọn loại hành trình">
      {[{ key: "oneWay" as const, label: "Một chiều", icon: ArrowRightLeft }, { key: "roundTrip" as const, label: "Khứ hồi", icon: ArrowRightLeft }, { key: "twoDays" as const, label: "Theo ngày", icon: CalendarDays }].filter((tab) => availableJourneys.includes(tab.key)).map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={visibleJourney === tab.key} className={visibleJourney === tab.key ? "is-selected" : ""} onClick={() => onJourneyChange(tab.key)}>{redesign && <tab.icon size={17} aria-hidden="true" />}{tab.label}</button>)}
    </div> : <p>Chưa có gói được xác nhận cho chiều này. Liên hệ để được tư vấn.</p>}
    {visibleJourney === "twoDays" && <div className="route-day-tabs" role="group" aria-label="Chọn gói theo ngày">{(["twoDays", "threeDays"] as const).filter((key) => available.includes(key)).map((key) => <button key={key} type="button" aria-pressed={visibleDays === key} className={visibleDays === key ? "is-selected" : ""} onClick={() => onJourneyChange(key)}>{packageLabels[key]}</button>)}</div>}
    {hero ? <div className="route-detail-design-endpoints" aria-label="Chiều hành trình">
      <div><small>Điểm đi</small><strong>{getPublicLocationLabel(activeDirection === "inbound" ? route.to : route.from)}</strong></div>
      <button type="button" aria-label="Đổi chiều hành trình" disabled={!pricing?.outbound.enabled || !pricing?.inbound.enabled} onClick={() => onDirectionChange(activeDirection === "inbound" ? "outbound" : "inbound")}><ArrowRightLeft size={18} aria-hidden="true" /></button>
      <div><small>Điểm đến</small><strong>{getPublicLocationLabel(activeDirection === "inbound" ? route.from : route.to)}</strong></div>
    </div> : pricing?.inbound.enabled && pricing.outbound.enabled && <div className="route-direction-switch"><span>Chiều</span>{(["outbound", "inbound"] as const).map((key) => <button key={key} type="button" aria-pressed={activeDirection === key} className={activeDirection === key ? "is-selected" : ""} onClick={() => onDirectionChange(key)}>{key === "outbound" ? getPublicLocationLabel(route.from) : getPublicLocationLabel(route.to)} → {key === "outbound" ? getPublicLocationLabel(route.to) : getPublicLocationLabel(route.from)}</button>)}</div>}
  </>;
  const picker = !pricing ? legacy : <div className="route-vehicle-picker">
    {!hero && journeyControls}
    {redesign && <div className="route-detail-price-heading"><h2>{prelaunch ? "Thông tin xe cho hành trình" : <>Chọn xe phù hợp<span className="route-price-title-desktop"> với hành trình</span></>}</h2><p>{prelaunch ? "Tuyến đang chuẩn bị, chưa nhận đặt chuyến." : selectedPackage ? `Giá cho chuyến ${packageLabels[selectedPackage].toLowerCase()}` : "Liên hệ để được tư vấn gói chuyến phù hợp."}</p></div>}
    <section className="mb-4 rounded-lg border border-border bg-card p-4 text-sm" aria-label="Thông tin tuyến đường">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground"><MapPin aria-hidden="true" size={18} /> Thông tin tuyến đường</h3>
      <dl className="grid gap-3 text-muted-foreground sm:grid-cols-3">
        <div><dt className="font-semibold text-foreground">Hành trình</dt><dd className="mt-1 leading-6">{displayRoute}</dd></div>
        {hasTravelTime ? <div><dt className="font-semibold text-foreground">Thời gian dự kiến</dt><dd className="mt-1 leading-6">{route.time}</dd></div> : null}
        {hasDistance ? <div><dt className="font-semibold text-foreground">Quãng đường tham khảo</dt><dd className="mt-1 leading-6">{route.distance}</dd></div> : null}
      </dl>
      {hasTravelTime || hasDistance ? <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Thời gian và quãng đường có thể thay đổi theo điểm đón, lộ trình và tình hình giao thông.</p> : null}
    </section>
    <div className="route-vehicle-grid">{displayedVehicles.map(({ vehicle, pkg }) => {
      const fixed = pkg.mode === "fixed" && typeof pkg.price === "number" && Number.isFinite(pkg.price) && pkg.price > 0;
      const image = vehicleImageByType[pkg.vehicleType] || vehicle.fallback;
      const vehicleHref = routeJourneyHref(routeComboHref(route, vehicleTypeSlug(pkg.vehicleType)), activeDirection, pkg.packageKey);
      const price = fixed ? pkg.priceLabel || `${pkg.price!.toLocaleString("vi-VN")} đ` : undefined;
      const priceBlock = <div className="route-vehicle-price" data-pricing-mode={prelaunch ? "prelaunch" : fixed ? "fixed" : "contact"}>{prelaunch ? <><strong>Đang chuẩn bị</strong><span>Chưa nhận đặt chuyến</span></> : fixed ? <><small>Giá chỉ</small><strong>{price}</strong><span>{packageLabels[selectedPackage]} / chuyến</span></> : <><strong>Liên hệ báo giá</strong><span>Xác nhận theo lịch thực tế</span></>}</div>;
      return <article className={`route-vehicle-card${vehicle.popular ? " is-popular" : ""}`} key={vehicle.type}>
        {redesign && <header className="route-vehicle-heading"><h3><Link href={vehicleHref}>{vehicle.type}</Link></h3>{vehicle.popular && <span className="route-vehicle-popular">Được đặt nhiều nhất</span>}</header>}
        <div className="route-vehicle-image"><Link href={vehicleHref} aria-label={`Xem tuyến ${displayRoute} bằng ${vehicle.type}`}><img src={image} alt={`Mẫu xe tham khảo ${vehicle.type.toLowerCase()}`} loading="lazy" /></Link>{!redesign && vehicle.popular && <span>Được đặt nhiều nhất</span>}</div>
        <div className="route-vehicle-body">
          {!redesign && <h3><Link href={vehicleHref}>{vehicle.type}</Link></h3>}
          <p className="route-vehicle-model">{redesign && <small>Mẫu xe tham khảo</small>}{vehicle.models}</p>
          <div className="route-vehicle-summary"><p className="route-vehicle-capacity"><UsersRound size={redesign ? 32 : 15} aria-hidden="true" /> {vehicle.capacity}</p>{redesign && priceBlock}</div>
          {!redesign && <ul>{vehicle.benefits.map((benefit) => <li key={benefit}>✓ {benefit}</li>)}</ul>}
          <div className="route-vehicle-bottom">
            {!redesign && priceBlock}
            {prelaunch ? <a className="button button-primary" href="/lien-he">Liên hệ tư vấn</a> : <RouteBookingActions compactLabels={redesign} route={canonicalRoute} routeId={route.id} displayRoute={displayRoute} vehicleType={pkg.vehicleType} price={price} direction={activeDirection} packageKey={pkg.packageKey} packageLabel={packageLabels[selectedPackage]} pricingMode={pkg.mode} airportContext={airportContext} />}
          </div>
        </div>
      </article>;
    })}</div>
    {redesign && visibleVehicles.length > 3 && <button className="route-detail-more-vehicles" type="button" aria-expanded={showAllVehicles} onClick={() => setShowAllVehicles((value) => !value)}>{showAllVehicles ? "Thu gọn loại xe" : `Xem thêm ${visibleVehicles.length - 3} loại xe`} <ArrowRight size={16} aria-hidden="true" /></button>}
  </div>;
  return hero ? <>
    <section className="route-detail-design-hero" aria-labelledby="route-detail-title">
      {hero}
      {pricing && <div className="route-detail-design-hero-controls"><h2>Chọn chuyến đi</h2>{journeyControls}</div>}
    </section>
    <div className="route-detail-design-main"><section className="route-detail-design-pricing" aria-label="Chọn gói và xe cho tuyến"><div id="pricing">{picker}</div></section></div>
  </> : picker;
}

export default RoutePricingSection;
