"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BusFront } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MediaPhoto } from "@/components/media-photo";
import { RouteBookingActions, type AirportBookingContext } from "@/components/route-booking-actions";
import { getPublicLocationLabel, getPublicRouteLabel } from "@/lib/public-location-label";
import {
  priceTypeLabel,
  routeComboHref,
  vehicleTypeSlug,
  type Route,
  type RoutePricingDirectionKey,
  type RoutePricingPackage,
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
          <div className="detail-price-media">
            {vehicleImageByType[vp.vehicleType] ? (
              <MediaPhoto
                src={vehicleImageByType[vp.vehicleType]}
                alt={vp.vehicleType}
                sizes="(max-width: 540px) 100vw, (max-width: 800px) 50vw, (max-width: 1180px) 35vw, 320px"
              />
            ) : (
              <BusFront size={32} strokeWidth={1.4} />
            )}
          </div>
          <Link href={`/loai-xe/${vehicleTypeSlug(vp.vehicleType)}`} className="vehicle-chip">
            {vp.vehicleType}
          </Link>
          <strong>{vp.price}</strong>
          <small>{priceTypeLabel(vp.priceType)} · Giá tham khảo</small>
          <Button size="sm" variant="outline" asChild>
            <Link href={routeComboHref(route, vehicleTypeSlug(vp.vehicleType))}>
              Thuê xe {vp.vehicleType} đi {getPublicLocationLabel(route.to)} <ArrowRight size={15} />
            </Link>
          </Button>
          <RouteBookingActions route={routeLabel} routeId={route.id} vehicleType={vp.vehicleType} price={vp.price} />
        </article>
      ))}
    </div>
  );
}

type JourneyPackage = "oneWay" | "roundTrip" | "twoDays" | "threeDays";

const vehicleCards = [
  { type: "Xe 4 chỗ", models: "Toyota Vios / Hyundai Accent hoặc tương đương", capacity: "1–3 hành khách", benefits: ["Xe riêng có tài xế", "Đón tại sân bay", "Đưa tận nơi"], popular: true, fallback: "/images/hero-dat-xe-sai-gon.webp" },
  { type: "Xe 7 chỗ", models: "Toyota Innova / Fortuner hoặc tương đương", capacity: "3–6 hành khách", benefits: ["Xe riêng có tài xế", "Hành lý thoải mái", "Đón tận nơi"], popular: false, fallback: "/images/destinations/ba-ria-vung-tau.webp" },
  { type: "Xe 16 chỗ", models: "Ford Transit hoặc tương đương", capacity: "7–14 hành khách", benefits: ["Phù hợp nhóm đông", "Có tài xế", "Đón trả tận nơi"], popular: false, fallback: "/images/destinations/ho-chi-minh.webp" },
  { type: "Xe 29 chỗ", models: "Thaco / Hyundai hoặc tương đương", capacity: "Nhóm / đoàn", benefits: ["Phù hợp đoàn đông", "Có tài xế", "Phục vụ theo lịch"], popular: false, fallback: "/images/destinations/long-an.webp" },
  { type: "Xe 45 chỗ", models: "Universe / Samco hoặc tương đương", capacity: "Đoàn lớn", benefits: ["Không gian rộng", "Có tài xế", "Phục vụ theo lịch"], popular: false, fallback: "/images/destinations/ben-tre.webp" },
  { type: "Limousine", models: "Dòng limousine cao cấp", capacity: "Không gian cao cấp", benefits: ["Nội thất cao cấp", "Tiện nghi", "Phù hợp khách VIP / doanh nghiệp"], popular: false, fallback: "/images/services/city-tour.png" },
] as const;

const packageLabels: Record<JourneyPackage, string> = { oneWay: "Một chiều", roundTrip: "Khứ hồi", twoDays: "2 ngày 1 đêm", threeDays: "3 ngày 2 đêm" };

function findPackage(rows: RoutePricingPackage[], type: string, selected: JourneyPackage) {
  const aliases: Record<JourneyPackage, string[]> = { oneWay: ["one_way", "mot_chieu", "mot-chieu", "oneway"], roundTrip: ["round_trip", "khu_hoi", "khu-hoi", "roundtrip"], twoDays: ["2d1n", "2_ngay_1_dem", "2-ngay-1-dem"], threeDays: ["3d2n", "3_ngay_2_dem", "3-ngay-2-dem"] };
  return rows.find((row) => row.vehicleType === type && (aliases[selected].some((alias) => row.packageKey.toLowerCase().includes(alias)) || (selected === "oneWay" && row.packageKey === "default")))
    ?? rows.find((row) => row.vehicleType === type && (selected === "oneWay" ? row.packageLabel.toLowerCase().includes("một chiều") : selected === "roundTrip" ? row.packageLabel.toLowerCase().includes("khứ hồi") : row.packageLabel.toLowerCase().includes("2 ngày")));
}

export function RoutePricingSection({ route, direction, onDirectionChange, vehicleImageByType = {} }: { route: Route; direction: RoutePricingDirectionKey; onDirectionChange: (direction: RoutePricingDirectionKey) => void; vehicleImageByType?: Record<string, string> }) {
  const [journey, setJourney] = useState<JourneyPackage>("oneWay");
  const [days, setDays] = useState<"twoDays" | "threeDays">("twoDays");
  const pricing = route.pricingV2;
  const activeDirection = pricing?.[direction]?.enabled ? direction : pricing?.outbound.enabled ? "outbound" : "inbound";
  const active = activeDirection ? pricing?.[activeDirection] : undefined;
  const selectedPackage = journey === "oneWay" || journey === "roundTrip" ? journey : days;
  const canonicalRoute = getPublicRouteLabel(route, " – ");
  const displayRoute = activeDirection === "outbound" ? canonicalRoute : `${getPublicLocationLabel(route.to)} – ${getPublicLocationLabel(route.from)}`;
  const pickupLocation = activeDirection === "outbound" ? route.originLocation : route.destinationLocation;
  const dropoffLocation = activeDirection === "outbound" ? route.destinationLocation : route.originLocation;
  const airportContext: AirportBookingContext | undefined = pickupLocation?.type === "airport" ? "pickup_from_airport" : dropoffLocation?.type === "airport" ? "dropoff_at_airport" : undefined;
  const rows = active?.packages ?? [];

  if (!pricing) return <LegacyPricingGrid route={route} vehicleImageByType={vehicleImageByType} />;
  return <div className="route-vehicle-picker">
    <div className="route-direction-tabs" role="tablist" aria-label="Chọn loại hành trình">
      {[{ key: "oneWay" as const, label: "Một chiều" }, { key: "roundTrip" as const, label: "Khứ hồi" }, { key: "twoDays" as const, label: "Theo ngày" }].map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={journey === tab.key} className={journey === tab.key ? "is-selected" : ""} onClick={() => setJourney(tab.key)}>{tab.label}</button>)}
    </div>
    {journey === "twoDays" && <div className="route-day-tabs" role="group" aria-label="Chọn gói theo ngày">{(["twoDays", "threeDays"] as const).map((key) => <button key={key} type="button" aria-pressed={days === key} className={days === key ? "is-selected" : ""} onClick={() => setDays(key)}>{packageLabels[key]}</button>)}</div>}
    {pricing.inbound.enabled && pricing.outbound.enabled && <div className="route-direction-switch"><span>Chiều</span>{(["outbound", "inbound"] as const).map((key) => <button key={key} type="button" aria-pressed={activeDirection === key} className={activeDirection === key ? "is-selected" : ""} onClick={() => onDirectionChange(key)}>{key === "outbound" ? getPublicLocationLabel(route.from) : getPublicLocationLabel(route.to)} → {key === "outbound" ? getPublicLocationLabel(route.to) : getPublicLocationLabel(route.from)}</button>)}</div>}
    <div className="route-vehicle-grid">{vehicleCards.map((vehicle) => { const pkg = findPackage(rows, vehicle.type, selectedPackage); const fixed = pkg?.mode === "fixed" && typeof pkg.price === "number" && pkg.price > 0; const image = vehicleImageByType[vehicle.type] || vehicle.fallback; return <article className={`route-vehicle-card${vehicle.popular ? " is-popular" : ""}`} key={vehicle.type}>
      <div className="route-vehicle-image"><img src={image} alt={vehicle.type} loading="lazy" /><span>{vehicle.popular ? "Phổ biến" : ""}</span></div>
      <div className="route-vehicle-body"><h3>{vehicle.type}</h3><p className="route-vehicle-model">{vehicle.models}</p><p className="route-vehicle-capacity">{vehicle.capacity}</p><ul>{vehicle.benefits.map((benefit) => <li key={benefit}>✓ {benefit}</li>)}</ul><div className="route-vehicle-bottom"><div className="route-vehicle-price">{fixed ? <><small>Từ</small><strong>{pkg.priceLabel || `${pkg.price!.toLocaleString("vi-VN")} đ`}</strong><span>{packageLabels[selectedPackage]} / chuyến</span></> : pkg?.mode === "disabled" || !pkg ? <strong>Chưa có giá</strong> : <><strong>Liên hệ báo giá</strong><span>Xác nhận theo lịch thực tế</span></>}</div>{pkg?.mode !== "disabled" && pkg ? <RouteBookingActions route={canonicalRoute} routeId={route.id} displayRoute={displayRoute} vehicleType={vehicle.type} price={fixed ? pkg.priceLabel || `${pkg.price!.toLocaleString("vi-VN")} đ` : undefined} direction={activeDirection} packageKey={pkg.packageKey} packageLabel={packageLabels[selectedPackage]} pricingMode={pkg.mode} airportContext={airportContext} /> : <Button disabled size="lg">Chưa mở bán</Button>}</div></div>
    </article>; })}</div>
  </div>;
}

export default RoutePricingSection;
