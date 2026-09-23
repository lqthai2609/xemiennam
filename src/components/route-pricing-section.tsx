"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BusFront } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MediaPhoto } from "@/components/media-photo";
import { PriceExplanation } from "@/components/price-explanation";
import { RouteBookingActions, type AirportBookingContext } from "@/components/route-booking-actions";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";
import { getPublicLocationLabel, getPublicRouteLabel } from "@/lib/public-location-label";
import {
  normalizePriceType,
  priceTypeLabel,
  routeComboHref,
  vehicleTypeSlug,
  type Route,
  type RoutePricingDirectionKey,
  type RoutePricingPackage,
} from "@/types/route";

function packageDisplayLabel(row: RoutePricingPackage): string {
  if (row.packageLabel !== row.packageKey) return row.packageLabel;
  const readable = row.packageKey.replace(/[_-]+/g, " ").trim();
  return readable ? readable.charAt(0).toLocaleUpperCase("vi") + readable.slice(1) : "Gói hành trình";
}

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

export function RoutePricingSection({
  route,
  direction,
  onDirectionChange,
  vehicleImageByType = {},
}: {
  route: Route;
  direction: RoutePricingDirectionKey;
  onDirectionChange: (direction: RoutePricingDirectionKey) => void;
  vehicleImageByType?: Record<string, string>;
}) {
  const pricing = route.pricingV2;
  const isPrelaunch = isPrelaunchAirportRoute(route);
  const [selectedPriceType, setSelectedPriceType] = useState<ReturnType<typeof normalizePriceType>>("one_way");
  const availableDirections = pricing ? (["outbound", "inbound"] as const).filter((key) => pricing[key].enabled) : [];
  const activeDirection = pricing && availableDirections.includes(direction) ? direction : availableDirections[0];
  const active = activeDirection ? pricing?.[activeDirection] : undefined;
  const availablePriceTypes = useMemo(() => {
    if (!active?.enabled) return [];
    return Array.from(new Set(active.packages
      .filter((row) => row.mode === "contact" || (row.mode === "fixed" && typeof row.price === "number" && row.price > 0))
      .map((row) => normalizePriceType(row.packageLabel || row.packageKey))));
  }, [active]);
  const activePriceType = availablePriceTypes.includes(selectedPriceType) ? selectedPriceType : availablePriceTypes[0];
  const grouped = useMemo(() => {
    if (!active?.enabled || !activePriceType) return [];
    const groups = new Map<string, RoutePricingPackage[]>();
    for (const row of active.packages) {
      const renderable = row.mode === "contact" || (row.mode === "fixed" && typeof row.price === "number" && row.price > 0);
      if (!renderable || normalizePriceType(row.packageLabel || row.packageKey) !== activePriceType) continue;
      const current = groups.get(row.vehicleType) ?? [];
      current.push(row);
      groups.set(row.vehicleType, current);
    }
    return Array.from(groups.entries());
  }, [active, activePriceType]);

  if (isPrelaunch && !pricing) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Chưa có mức giá sân bay được xác minh. Vui lòng liên hệ để Alo Đặt Xe ghi nhận nhu cầu và báo giá khi đủ dữ liệu vận hành.
      </div>
    );
  }

  if (!pricing) {
    return <LegacyPricingGrid route={route} vehicleImageByType={vehicleImageByType} />;
  }

  const canonicalRoute = getPublicRouteLabel(route, " – ");
  const displayRoute = activeDirection === "outbound" ? canonicalRoute : `${getPublicLocationLabel(route.to)} – ${getPublicLocationLabel(route.from)}`;
  const destination = getPublicLocationLabel(activeDirection === "outbound" ? route.to : route.from);
  const pickupLocation =
    activeDirection === "outbound"
      ? route.originLocation
      : activeDirection === "inbound"
        ? route.destinationLocation
        : undefined;
  const dropoffLocation =
    activeDirection === "outbound"
      ? route.destinationLocation
      : activeDirection === "inbound"
        ? route.originLocation
        : undefined;
  const airportContext: AirportBookingContext | undefined =
    pickupLocation?.type === "airport"
      ? "pickup_from_airport"
      : dropoffLocation?.type === "airport"
        ? "dropoff_at_airport"
        : undefined;
  const airportName =
    airportContext === "pickup_from_airport"
      ? getPublicLocationLabel(pickupLocation)
      : airportContext === "dropoff_at_airport"
        ? getPublicLocationLabel(dropoffLocation)
        : undefined;

  return (
    <>
      <div className="mb-5">
        <PriceExplanation compact />
      </div>
      {availableDirections.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Chọn chiều di chuyển">
          {availableDirections.map((key) => {
            const selected = key === direction;
            const label = key === "outbound" ? getPublicRouteLabel(route) : `${getPublicLocationLabel(route.to)} → ${getPublicLocationLabel(route.from)}`;
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => onDirectionChange(key)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      )}

      {availablePriceTypes.length > 1 && (
        <div className="mb-6 border-b border-border" role="tablist" aria-label="Chọn loại hình phục vụ">
          <div className="flex gap-1 overflow-x-auto">
            {availablePriceTypes.map((priceType) => (
              <button
                key={priceType}
                type="button"
                role="tab"
                aria-selected={activePriceType === priceType}
                onClick={() => setSelectedPriceType(priceType)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activePriceType === priceType ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {priceTypeLabel(priceType)}
              </button>
            ))}
          </div>
        </div>
      )}

      {active?.enabled && grouped.length > 0 ? (
        <div className="detail-price-grid">
          {grouped.map(([vehicleType, packages]) => (
            <article className="detail-price-card" key={`${direction}-${vehicleType}`}>
              <div className="detail-price-media">
                {vehicleImageByType[vehicleType] ? (
                  <MediaPhoto
                    src={vehicleImageByType[vehicleType]}
                    alt={vehicleType}
                    sizes="(max-width: 540px) 100vw, (max-width: 800px) 50vw, (max-width: 1180px) 35vw, 320px"
                  />
                ) : (
                  <BusFront size={32} strokeWidth={1.4} />
                )}
              </div>

              <Link href={`/loai-xe/${vehicleTypeSlug(vehicleType)}`} className="vehicle-chip">
                {vehicleType}
              </Link>

              <div className="flex w-full flex-col gap-4">
                {packages.map((pkg) => {
                  const fixedPrice = pkg.mode === "fixed" && typeof pkg.price === "number" && pkg.price > 0 ? pkg.price : undefined;
                  const fixed = fixedPrice !== undefined;
                  const priceLabel = fixed ? pkg.priceLabel || `${fixedPrice.toLocaleString("vi-VN")} đ` : pkg.contactText || "Liên hệ để nhận báo giá";
                  return (
                    <div className="border-border border-t pt-3 first:border-t-0 first:pt-0" key={`${pkg.vehicleId}-${pkg.packageKey}`}>
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{packageDisplayLabel(pkg)}</span>
                        <strong className="text-right">{priceLabel}</strong>
                      </div>
                      <small>{fixed ? "Giá tham khảo" : "Xác nhận giá theo lịch thực tế"}</small>
                      <RouteBookingActions
                        route={canonicalRoute}
                        routeId={route.id}
                        displayRoute={displayRoute}
                        vehicleType={vehicleType}
                        price={fixed ? priceLabel : undefined}
                        direction={activeDirection}
                        packageKey={pkg.packageKey}
                        packageLabel={packageDisplayLabel(pkg)}
                        pricingMode={pkg.mode}
                        airportContext={airportContext}
                        airportName={airportName}
                      />
                    </div>
                  );
                })}
              </div>

              <Button size="sm" variant="outline" asChild>
                <Link href={activeDirection === "outbound" ? routeComboHref(route, vehicleTypeSlug(vehicleType)) : `/loai-xe/${vehicleTypeSlug(vehicleType)}`}>
                  {activeDirection === "outbound" ? `Xem xe ${vehicleType} đi ${destination}` : `Xem xe ${vehicleType}`} <ArrowRight size={15} />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          Chưa có mức giá công khai cho chiều này. Vui lòng liên hệ để nhận báo giá theo lịch thực tế.
        </div>
      )}
    </>
  );
}

export default RoutePricingSection;
