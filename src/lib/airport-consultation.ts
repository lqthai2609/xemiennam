import type { AirportBookingContext } from "@/components/route-booking-actions";
import type { AirportHubRoute } from "@/lib/api/airport-routes";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";

export type AirportConsultationJourney = {
  key: string;
  label: string;
  context: AirportBookingContext;
  prelaunch?: boolean;
};

export function airportConsultationLabel(context: AirportBookingContext): string {
  return context === "pickup_from_airport" ? "Tư vấn đón tại sân bay" : "Tư vấn tiễn đến sân bay";
}

export function airportHubConsultationJourneys(items: AirportHubRoute[]): AirportConsultationJourney[] {
  return items.flatMap((item) => {
    const readiness = item.route.contentReadiness;
    const direction = item.pricingDirection;
    const from = direction === "outbound" ? item.routePair.originLocationId : item.routePair.destinationLocationId;
    const to = direction === "outbound" ? item.routePair.destinationLocationId : item.routePair.originLocationId;
    const arrival = item.travelDirection === "from_airport";
    if (isPrelaunchAirportRoute(item.route) || item.airport.slug === "san-bay-long-thanh" || item.airport.id === 9102 || item.routePair.usesLegacyLocationFallback
      || !readiness || !Number.isInteger(readiness.version) || readiness.version < 1 || readiness.serviceState !== "live" || readiness.mappingState !== "clear"
      || !item.routePair[direction].enabled || !item.route.pricingV2?.[direction].enabled
      || !item.route.pricingV2[direction].packages.some((pkg) => pkg.mode !== "disabled")
      || (arrival ? from : to) !== item.airport.id || (arrival ? to : from) !== item.counterpart.id) return [];
    return [{ key: `${item.route.id}:${direction}`, label: `${item.from} → ${item.to}`, context: arrival ? "pickup_from_airport" as const : "dropoff_at_airport" as const }];
  });
}

// A local request draft, never a quote, capacity assessment or booking confirmation.
export function buildAirportConsultationDraft(journey: AirportConsultationJourney, input: {
  passengers: string;
  bags: string;
  luggageDetails: string;
  nameplate: boolean;
}): { text: string; error: string | null } {
  if (journey.prelaunch) return { text: "", error: "Tuyến đang chuẩn bị, chưa nhận đặt chuyến. Vui lòng liên hệ tư vấn trước." };
  if (input.passengers && (!/^\d+$/.test(input.passengers) || !Number.isSafeInteger(Number(input.passengers)) || Number(input.passengers) < 1)) {
    return { text: "", error: "Số khách phải là số nguyên từ 1 trở lên hoặc để trống nếu chưa rõ." };
  }
  if (input.bags && (!/^\d+$/.test(input.bags) || !Number.isSafeInteger(Number(input.bags)))) {
    return { text: "", error: "Số kiện hành lý phải là số nguyên từ 0 trở lên hoặc để trống nếu chưa rõ." };
  }
  const details = input.luggageDetails.trim();
  if (details.length > 160 || /[\x00-\x1f<>]/.test(details)) return { text: "", error: "Mô tả hành lý tối đa 160 ký tự, không chứa xuống dòng hoặc ký tự đánh dấu." };
  return { error: null, text: [
    airportConsultationLabel(journey.context),
    `Hành trình: ${journey.label}`,
    `Số khách: ${input.passengers || "Chưa rõ, cần tư vấn"}`,
    `Hành lý: ${input.bags ? `${input.bags} kiện` : "Chưa rõ, cần tư vấn"}`,
    `Kích thước/loại hành lý: ${details || "Chưa rõ, cần tư vấn"}`,
    ...(journey.context === "pickup_from_airport" ? [`Nhu cầu bảng tên: ${input.nameplate ? "Có, cần xác nhận khả năng phục vụ và chi phí" : "Chưa yêu cầu"}`] : []),
    "Nhờ tư vấn xe, giờ đón, giá và điều kiện phục vụ. Đây là yêu cầu tư vấn, chưa xác nhận chuyến.",
  ].join("\n") };
}
