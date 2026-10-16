import { NextResponse } from "next/server";
import { z } from "zod";
import { promotionCodeInput } from "@/lib/booking-promotion-code";
import { resolveRouteContext, resolveVehicleId } from "@/lib/api/booking-context";
import { resolvePriceRulesWithPromotion } from "@/lib/api/promotion-pricing";
import { applyCoupon, CouponError } from "@/lib/api/coupon";
import { normalizePricingPackageKey } from "@/lib/api/pricing-v2";
const schema = z.object({
  promotionCode: promotionCodeInput.refine(Boolean), routeId: z.string().regex(/^[1-9]\d*$/),
  vehicleType: z.string().min(1).max(100), direction: z.enum(["outbound", "inbound"]),
  packageKey: z.string().min(1).max(80), departureDate: z.string().max(10).default(""),
  departureTime: z.string().max(5).default(""),
});
const respond = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
/** Read-only: no lead, slot, notification, or customer identity is created here. */
export async function POST(request: Request) {
  if (process.env.ALO_COUPONS_ENABLED !== "true") return respond({ ok: false, error: "Tính năng áp dụng mã chưa được mở." }, 503);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return respond({ ok: false, error: "Vui lòng chọn đủ thông tin chuyến và nhập mã hợp lệ." }, 400);
  try {
    const d = parsed.data;
    const [r, vehicleId] = await Promise.all([resolveRouteContext(d.routeId, "", true), resolveVehicleId(d.vehicleType, true)]);
    if (!r.route || r.route.id !== Number(d.routeId)) return respond({ ok: false, error: "Không tìm thấy tuyến đã chọn." }, 400);
    const context = { route: r.route, direction: d.direction, vehicleId, packageKey: normalizePricingPackageKey(d.packageKey),
      pickup: r.locationsById.get(d.direction === "inbound" ? r.destinationLocationId : r.originLocationId),
      dropoff: r.locationsById.get(d.direction === "inbound" ? r.originLocationId : r.destinationLocationId),
      quantities: { extra_stop: 0, waiting_minute: 0 }, departureDate: d.departureDate, departureTime: d.departureTime };
    const result = await applyCoupon(d.promotionCode, await resolvePriceRulesWithPromotion(context), context);
    return respond({ ok: true, quote: result.quote });
  } catch (error) {
    return respond({ ok: false, error: error instanceof CouponError ? error.message : "Chưa kiểm tra được giá chuyến. Vui lòng thử lại." }, error instanceof CouponError ? error.status : 503);
  }
}
