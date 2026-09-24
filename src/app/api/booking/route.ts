import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { embeddedTermName, fetchRawRoutes, fetchRawVehicles } from "@/lib/api/raw";
import { fetchLocationsV2, locationById } from "@/lib/api/locations";
import { mapWPRouteToRoutePairV2 } from "@/lib/api/route-directions";
import { resolvePriceRulesV2 } from "@/lib/api/price-rules";
import { wpAuthedFetch } from "@/lib/api/wp-auth";
import { sendBookingNotification } from "@/lib/booking-notification";
import { formatIntermediateStops, intermediateStopsInputSchema } from "@/lib/booking-stops";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const bookingRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Thiếu họ tên."),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại không đúng định dạng Việt Nam."),
  route: z.string().trim().min(1, "Thiếu tuyến quan tâm."),
  routeId: z.string().trim().regex(/^\d+$/).optional(),
  vehicleType: z.string().trim().min(1, "Thiếu loại xe."),
  departureDate: z.string().trim().optional().default(""),
  departureTime: z.union([z.literal(""), z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ khởi hành không hợp lệ.")]).optional().default(""),
  direction: z.enum(["outbound", "inbound"]).optional(),
  packageKey: z.string().trim().max(80).optional(),
  pricingMode: z.enum(["fixed", "contact"]).optional(),
  pickupLocationId: z.coerce.number().int().positive().optional(),
  dropoffLocationId: z.coerce.number().int().positive().optional(),
  pickupAddress: z.string().trim().max(240, "Địa chỉ đón tối đa 240 ký tự.").optional().default(""),
  dropoffAddress: z.string().trim().max(240, "Địa chỉ trả tối đa 240 ký tự.").optional().default(""),
  pickupNote: z.string().trim().max(300, "Ghi chú điểm đón tối đa 300 ký tự.").optional().default(""),
  intermediateStops: intermediateStopsInputSchema.optional().default([]),
  note: z.string().trim().max(500).optional().default(""),
});

const OTHER_ROUTE_LABEL = "Tuyến khác";

type ResolvedRouteContext = {
  routeId: number | null;
  originLocationId: number;
  destinationLocationId: number;
  validLocationIds: Set<number>;
  route: Awaited<ReturnType<typeof fetchRawRoutes>>[number] | undefined;
  locationsById: ReturnType<typeof locationById>;
};

async function resolveRouteContext(
  routeId: string | undefined,
  routeLabel: string,
): Promise<ResolvedRouteContext> {
  const [routes, locations] = await Promise.all([fetchRawRoutes(), fetchLocationsV2()]);
  const locationsById = locationById(locations);
  const validLocationIds = new Set(locations.map((location) => location.id));

  let match = routeId
    ? routes.find((route) => route.id === Number(routeId))
    : undefined;

  if (!match && routeLabel !== OTHER_ROUTE_LABEL) {
    match = routes.find((route) => {
      const pair = mapWPRouteToRoutePairV2(route);
      const origin = pair.originLocationId > 0 ? locationsById.get(pair.originLocationId) : undefined;
      const destination = pair.destinationLocationId > 0 ? locationsById.get(pair.destinationLocationId) : undefined;
      const from = origin?.name || route.meta.diem_di || "";
      const to = destination?.name || route.meta.diem_den || "";
      return `${from} – ${to}` === routeLabel;
    });
  }

  if (!match) {
    return {
      routeId: null,
      originLocationId: 0,
      destinationLocationId: 0,
      validLocationIds,
      route: undefined,
      locationsById,
    };
  }

  const pair = mapWPRouteToRoutePairV2(match);
  return {
    routeId: match.id,
    originLocationId: pair.originLocationId,
    destinationLocationId: pair.destinationLocationId,
    validLocationIds,
    route: match,
    locationsById,
  };
}

function resolveBookingLocationId(
  requestedId: number | undefined,
  fallbackId: number,
  validLocationIds: Set<number>,
): number {
  if (requestedId && validLocationIds.has(requestedId)) return requestedId;
  if (fallbackId > 0 && validLocationIds.has(fallbackId)) return fallbackId;
  return 0;
}

async function resolveVehicleId(vehicleTypeLabel: string): Promise<number | null> {
  const vehicles = await fetchRawVehicles();
  const match = vehicles.find((v) => embeddedTermName(v._embedded, "vehicle_type") === vehicleTypeLabel);
  return match?.id ?? null;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Nội dung gửi lên không phải JSON hợp lệ." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Thông tin đặt xe chưa hợp lệ.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const [routeContext, vehicleId] = await Promise.all([
    resolveRouteContext(data.routeId, data.route),
    resolveVehicleId(data.vehicleType),
  ]);

  const direction = data.direction ?? "outbound";
  const defaultPickupLocationId =
    direction === "inbound" ? routeContext.destinationLocationId : routeContext.originLocationId;
  const defaultDropoffLocationId =
    direction === "inbound" ? routeContext.originLocationId : routeContext.destinationLocationId;

  const pickupLocationId = resolveBookingLocationId(
    data.pickupLocationId,
    defaultPickupLocationId,
    routeContext.validLocationIds,
  );
  const dropoffLocationId = resolveBookingLocationId(
    data.dropoffLocationId,
    defaultDropoffLocationId,
    routeContext.validLocationIds,
  );

  const priceRules = resolvePriceRulesV2({
    route: routeContext.route,
    direction,
    vehicleId,
    packageKey: data.packageKey,
    pickup: routeContext.locationsById.get(pickupLocationId),
    dropoff: routeContext.locationsById.get(dropoffLocationId),
    quantities: {
      extra_stop: data.intermediateStops.length,
      waiting_minute: data.intermediateStops.reduce((sum, stop) => sum + stop.waitingMinutes, 0),
    },
    departureDate: data.departureDate,
    departureTime: data.departureTime,
  });
  const surcharge = priceRules.surcharge;

  const noteParts: string[] = [];
  if (routeContext.routeId === null) noteParts.push(`Tuyến quan tâm (chưa khớp CMS): ${data.route}`);
  if (vehicleId === null) noteParts.push(`Loại xe (chưa khớp CMS): ${data.vehicleType}`);

  const pricingContext = [
    data.direction ? `direction=${data.direction}` : "",
    data.packageKey ? `package=${data.packageKey}` : "",
    data.pricingMode ? `mode=${data.pricingMode}` : "",
  ].filter(Boolean);
  if (pricingContext.length) noteParts.push(`Pricing context: ${pricingContext.join("; ")}.`);
  noteParts.push(`Surcharge: mode=${surcharge.mode}; reason=${surcharge.reason}.`);
  noteParts.push(`Price rules: mode=${priceRules.mode}; reason=${priceRules.reason}.`);
  noteParts.push(`Price condition: mode=${priceRules.condition.mode}; reason=${priceRules.condition.reason}.`);
  if (data.pickupAddress) noteParts.push(`Điểm đón: ${data.pickupAddress}.`);
  if (data.dropoffAddress) noteParts.push(`Điểm trả: ${data.dropoffAddress}.`);
  if (data.pickupNote) noteParts.push(`Ghi chú điểm đón: ${data.pickupNote}.`);
  if (data.intermediateStops.length) {
    noteParts.push(`Điểm dừng trung gian: ${formatIntermediateStops(data.intermediateStops)}.`);
  }
  if (data.note) noteParts.push(data.note);

  // Only the backend's successful creation of a booking_request yields a lead_id.
  // The referrer is the form's own page; persist only allowlisted campaign fields.
  let acquisition: Record<string, string> = {};
  try {
    const page = new URL(request.headers.get("referer") ?? "");
    if (page.origin === new URL(request.url).origin) {
      acquisition = { landing_path: page.pathname };
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"] as const) {
        const value = page.searchParams.get(key);
        if (value) acquisition[key] = value;
      }
      if (acquisition.utm_source) acquisition.source = acquisition.utm_source;
      if (acquisition.utm_medium) acquisition.medium = acquisition.utm_medium;
      if (acquisition.utm_campaign) acquisition.campaign = acquisition.utm_campaign;
    }
  } catch { /* Missing or invalid referrer remains unknown. */ }

  const result = await wpAuthedFetch<{ id: number; lead_id: number; replayed: boolean }>("/gocar/v1/leads", {
    method: "POST",
    body: {
      idempotency_key: request.headers.get("x-lead-idempotency-key") || randomUUID(),
      acquisition,
      booking: {
        title: data.fullName,
        status: "publish",
        meta: {
        so_dien_thoai: data.phone,
        tuyen_quan_tam: routeContext.routeId ?? 0,
        loai_xe_dat: vehicleId ?? 0,
        ngay_di: data.departureDate,
        pickup_location_id: pickupLocationId,
        dropoff_location_id: dropoffLocationId,
        pickup_address: data.pickupAddress,
        dropoff_address: data.dropoffAddress,
        pickup_note: data.pickupNote,
        intermediate_stops_v1: data.intermediateStops.map((stop, index) => ({
          order: index + 1,
          address: stop.address,
          waiting_minutes: stop.waitingMinutes,
        })),
        pickup_service_zone_id: routeContext.locationsById.get(pickupLocationId)?.serviceZoneId ?? "",
        dropoff_service_zone_id: routeContext.locationsById.get(dropoffLocationId)?.serviceZoneId ?? "",
        surcharge_mode: surcharge.mode,
        ...(surcharge.mode === "fixed" && surcharge.amount ? { surcharge_amount: surcharge.amount } : {}),
        surcharge_rule_keys: surcharge.matchedRuleKeys,
        pricing_resolution_mode: priceRules.mode,
        pricing_resolution_reason: priceRules.reason,
        ...(priceRules.basePrice ? { base_price_snapshot: priceRules.basePrice } : {}),
        ...(priceRules.modifierAmount ? { price_modifier_amount: priceRules.modifierAmount } : {}),
        ...(priceRules.estimatedTotal ? { estimated_total: priceRules.estimatedTotal } : {}),
        price_modifier_resolution_v1: priceRules.modifiers.map((modifier) => ({
          type: modifier.type,
          quantity: modifier.quantity,
          billable_units: modifier.billableUnits,
          mode: modifier.mode,
          ...(modifier.amount ? { amount: modifier.amount } : {}),
          ...(modifier.ruleKey ? { rule_key: modifier.ruleKey } : {}),
          reason: modifier.reason,
        })),
        price_condition_resolution_v1: {
          mode: priceRules.condition.mode,
          ...(priceRules.condition.amount ? { amount: priceRules.condition.amount } : {}),
          ...(priceRules.condition.ruleKey ? { rule_key: priceRules.condition.ruleKey } : {}),
          reason: priceRules.condition.reason,
          policy_version: priceRules.condition.policyVersion ?? 0,
          timezone: priceRules.condition.timezone ?? "",
          departure_date: data.departureDate,
          departure_time: data.departureTime,
        },
        ghi_chu: noteParts.join(" | "),
        trang_thai_booking: "moi",
        },
      },
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status || 502 });
  }

  if (result.data.replayed) {
    return NextResponse.json({ ok: true, id: result.data.lead_id, leadId: result.data.lead_id, notificationSent: false, replayed: true });
  }
  const notification = await sendBookingNotification({
    bookingId: result.data.id,
    fullName: data.fullName,
    phone: data.phone,
    route: data.route,
    vehicleType: data.vehicleType,
    departureDate: data.departureDate,
    pickupAddress: data.pickupAddress,
    dropoffAddress: data.dropoffAddress,
    pickupNote: data.pickupNote,
    intermediateStops: data.intermediateStops,
    note: data.note,
  });

  if (!notification.sent) {
    console.error("Booking notification was not sent", {
      bookingId: result.data.id,
      reason: notification.reason,
    });
  }

  return NextResponse.json({ ok: true, id: result.data.lead_id, leadId: result.data.lead_id, notificationSent: notification.sent });
}
