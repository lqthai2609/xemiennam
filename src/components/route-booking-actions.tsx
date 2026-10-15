"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { ClipboardList, Phone } from "lucide-react";
import { AirportQuickConsultation } from "@/components/airport-quick-consultation";
import { airportConsultationLabel } from "@/lib/airport-consultation";
import { Button } from "@/components/ui/button";
import { ZaloIcon } from "@/components/zalo-icon";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_HOTLINE_TEL } from "@/lib/site-config";
import type { RoutePricingDirectionKey, RoutePricingMode } from "@/types/route";

export type AirportBookingContext = "pickup_from_airport" | "dropoff_at_airport";

// The form, validation and airport advice are only needed after booking intent.
const loadBookingDialog = () => import("@/components/quick-booking-dialog");
const QuickBookingDialog = dynamic(
  () => loadBookingDialog().then((module) => module.QuickBookingDialog),
  { ssr: false, loading: () => <p role="status">Đang mở biểu mẫu đặt xe…</p> },
);

function warmBookingDialog() {
  void loadBookingDialog().catch(() => { /* Opening the dialog can retry a failed preload. */ });
}

export type BookingPricingContext = {
  routeId?: string;
  displayRoute?: string;
  direction?: RoutePricingDirectionKey;
  packageKey?: string;
  packageLabel?: string;
  pricingMode?: RoutePricingMode;
  airportContext?: AirportBookingContext;
  airportName?: string;
  initialTrip?: { pickupAddress?: string; dropoffAddress?: string; departureAt?: string };
};

export function RouteBookingActions({
  route,
  routeId,
  displayRoute,
  vehicleType,
  price,
  direction = "outbound",
  packageKey,
  packageLabel,
  pricingMode = "fixed",
  airportContext,
  airportName,
  compactLabels = false,
  initialTrip,
}: {
  route: string;
  vehicleType: string;
  price?: string;
  compactLabels?: boolean;
} & BookingPricingContext) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const zaloLink = getZaloChatLink();

  function closeDialog() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  if (pricingMode === "disabled") return null;

  const isQuote = pricingMode === "contact";
  const consultationLabel = airportContext ? airportConsultationLabel(airportContext) : null;
  const consultationOnly = /long[ -]th[aà]nh/i.test(`${airportName || ""} ${route} ${displayRoute || ""}`);

  return (
    <>
      <div className="detail-price-actions route-booking-actions">
        {zaloLink && (
          <Button size="sm" className="route-booking-primary zalo-cta" asChild>
            <a href={zaloLink} target="_blank" rel="noopener noreferrer" aria-label={`${consultationOnly ? "Liên hệ tư vấn trước" : consultationLabel || (isQuote ? "Nhắn Zalo báo giá" : "Nhắn Zalo đặt xe")} ${vehicleType}`} className="zalo-cta">
              <ZaloIcon />
              {consultationOnly ? "Liên hệ tư vấn trước" : consultationLabel || (isQuote ? "Nhắn Zalo báo giá" : "Nhắn Zalo đặt xe")}
            </a>
          </Button>
        )}
        <div className="route-booking-secondary">
          {airportContext && !consultationOnly && <AirportQuickConsultation journeys={[{ key: `${routeId}:${direction}:${packageKey}:${vehicleType}`, label: `${displayRoute || route} · ${vehicleType}${packageLabel ? ` · ${packageLabel}` : ""}`, context: airportContext }]} />}
          {!consultationOnly && <Button ref={triggerRef} size="sm" variant={zaloLink ? "outline" : "default"} className="detail-price-cta" aria-label={compactLabels ? `Gửi yêu cầu ${vehicleType}` : undefined} onPointerEnter={warmBookingDialog} onFocus={warmBookingDialog} onClick={() => setOpen(true)}>
            {compactLabels && <ClipboardList aria-hidden="true" size={20} />}{compactLabels ? "Gửi yêu cầu" : isQuote ? "Gửi yêu cầu báo giá" : "Gửi yêu cầu đặt xe"}
          </Button>}
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${SITE_HOTLINE_TEL}`} aria-label={`${consultationOnly || airportContext ? "Gọi tư vấn" : isQuote ? "Gọi báo giá" : "Gọi đặt xe"} ${vehicleType}`}>
              <Phone aria-hidden="true" size={16} />
              {consultationOnly || airportContext ? "Gọi tư vấn" : isQuote ? "Gọi báo giá" : "Gọi đặt xe"}
            </a>
          </Button>
        </div>
      </div>
      {consultationOnly ? <p className="route-booking-note">Đang chuẩn bị, chưa nhận đặt chuyến. Liên hệ tư vấn trước.</p> : !isQuote && <p className="route-booking-note">Chúng tôi xác nhận lịch xe và chi phí cuối cùng trước khi nhận chuyến.</p>}
      {open && !consultationOnly && (
        <QuickBookingDialog
          route={route}
          routeId={routeId}
          displayRoute={displayRoute}
          vehicleType={vehicleType}
          price={price}
          direction={direction}
          packageKey={packageKey}
          packageLabel={packageLabel}
          pricingMode={pricingMode}
          airportContext={airportContext}
          airportName={airportName}
          initialTrip={initialTrip}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

export default RouteBookingActions;
