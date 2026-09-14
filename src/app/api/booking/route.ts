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
  requestType: z.enum(["booking", "quote"]).optional(),
  airportTerminal: z.string().trim().max(20).optional(),
  flightNumber: z.string().trim().max(40).optional(),
  passengerCount: z.string().trim().max(3).optional(),
  luggage: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional().default(""),
});

const OTHER_ROUTE_LABEL = "Tuyến khác";

async function resolveRouteId(routeId: string | undefined, routeLabel: string): Promise<number | null> {
  const routes = await fetchRawRoutes();

  if (routeId) {
    const stableId = Number(routeId);
    if (routes.some((route) => route.id === stableId)) return stableId;
  }

  if (routeLabel === OTHER_ROUTE_LABEL) return null;

  const locations = await fetchLocationsV2();
  const locationsById = locationById(locations);
  const match = routes.find((route) => {
    const pair = mapWPRouteToRoutePairV2(route);
    const origin = pair.originLocationId > 0 ? locationsById.get(pair.originLocationId) : undefined;
    const destination = pair.destinationLocationId > 0 ? locationsById.get(pair.destinationLocationId) : undefined;
    const from = origin?.name || route.meta.diem_di || "";
    const to = destination?.name || route.meta.diem_den || "";
    return `${from} – ${to}` === routeLabel;
  });

  return match?.id ?? null;
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

  const [routeId, vehicleId] = await Promise.all([
    resolveRouteId(data.routeId, data.route),
    resolveVehicleId(data.vehicleType),
  ]);

  const noteParts: string[] = [];
  if (routeId === null) noteParts.push(`Tuyến quan tâm (chưa khớp CMS): ${data.route}`);
  if (vehicleId === null) noteParts.push(`Loại xe (chưa khớp CMS): ${data.vehicleType}`);

  const pricingContext = [
    data.direction ? `direction=${data.direction}` : "",
    data.packageKey ? `package=${data.packageKey}` : "",
    data.pricingMode ? `mode=${data.pricingMode}` : "",
  ].filter(Boolean);
  if (pricingContext.length) noteParts.push(`Pricing context: ${pricingContext.join("; ")}.`);
  if (data.requestType === "quote") noteParts.push("Yêu cầu báo giá.");
  if (data.airportTerminal) noteParts.push(`Nhà ga: ${data.airportTerminal}.`);
  if (data.flightNumber) noteParts.push(`Số chuyến bay: ${data.flightNumber}.`);
  if (data.passengerCount) noteParts.push(`Số hành khách: ${data.passengerCount}.`);
  if (data.luggage) noteParts.push(`Hành lý: ${data.luggage}.`);
  if (data.note) noteParts.push(data.note);

  const result = await wpAuthedFetch<{ id: number }>("/booking_request", {
    method: "POST",
    body: {
      title: data.fullName,
      status: "publish",
      meta: {
        so_dien_thoai: data.phone,
        tuyen_quan_tam: routeId ?? 0,
        loai_xe_dat: vehicleId ?? 0,
        ngay_di: data.departureDate,
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
