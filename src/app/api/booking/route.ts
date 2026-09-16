import { NextResponse } from "next/server";
import { z } from "zod";

import { embeddedTermName, fetchRawRoutes, fetchRawVehicles } from "@/lib/api/raw";
import { fetchLocationsV2, locationById } from "@/lib/api/locations";
import { mapWPRouteToRoutePairV2 } from "@/lib/api/route-directions";
import { wpAuthedFetch } from "@/lib/api/wp-auth";
import { sendBookingNotification } from "@/lib/booking-notification";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const bookingRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Thiếu họ tên."),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại không đúng định dạng Việt Nam."),
  route: z.string().trim().min(1, "Thiếu tuyến quan tâm."),
  routeId: z.string().trim().regex(/^\d+$/).optional(),
  vehicleType: z.string().trim().min(1, "Thiếu loại xe."),
  departureDate: z.string().trim().optional().default(""),
  direction: z.enum(["outbound", "inbound"]).optional(),
  packageKey: z.string().trim().max(80).optional(),
  pricingMode: z.enum(["fixed", "contact"]).optional(),
  pickupLocationId: z.coerce.number().int().positive().optional(),
  dropoffLocationId: z.coerce.number().int().positive().optional(),
  pickupAddress: z.string().trim().max(240, "Địa chỉ đón tối đa 240 ký tự.").optional().default(""),
  dropoffAddress: z.string().trim().max(240, "Địa chỉ trả tối đa 240 ký tự.").optional().default(""),
  pickupNote: z.string().trim().max(300, "Ghi chú điểm đón tối đa 300 ký tự.").optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
});

const OTHER_ROUTE_LABEL = "Tuyến khác";

type ResolvedRouteContext = {
  routeId: number | null;
  originLocationId: number;
  destinationLocationId: number;
  validLocationIds: Set<number>;
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
    };
  }

  const pair = mapWPRouteToRoutePairV2(match);
  return {
    routeId: match.id,
    originLocationId: pair.originLocationId,
    destinationLocationId: pair.destinationLocationId,
    validLocationIds,
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

  const noteParts: string[] = [];
  if (routeContext.routeId === null) noteParts.push(`Tuyến quan tâm (chưa khớp CMS): ${data.route}`);
  if (vehicleId === null) noteParts.push(`Loại xe (chưa khớp CMS): ${data.vehicleType}`);

  const pricingContext = [
    data.direction ? `direction=${data.direction}` : "",
    data.packageKey ? `package=${data.packageKey}` : "",
    data.pricingMode ? `mode=${data.pricingMode}` : "",
  ].filter(Boolean);
  if (pricingContext.length) noteParts.push(`Pricing context: ${pricingContext.join("; ")}.`);
  if (data.pickupAddress) noteParts.push(`Điểm đón: ${data.pickupAddress}.`);
  if (data.dropoffAddress) noteParts.push(`Điểm trả: ${data.dropoffAddress}.`);
  if (data.pickupNote) noteParts.push(`Ghi chú điểm đón: ${data.pickupNote}.`);
  if (data.note) noteParts.push(data.note);

  const result = await wpAuthedFetch<{ id: number }>("/booking_request", {
    method: "POST",
    body: {
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
        ghi_chu: noteParts.join(" | "),
        trang_thai_booking: "moi",
      },
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status || 502 });
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
    note: data.note,
  });

  if (!notification.sent) {
    console.error("Booking notification was not sent", {
      bookingId: result.data.id,
      reason: notification.reason,
    });
  }

  return NextResponse.json({ ok: true, id: result.data.id, notificationSent: notification.sent });
}
