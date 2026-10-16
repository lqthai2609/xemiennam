import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { resolveRouteContext, resolveBookingLocationId, resolveVehicleId } from "@/lib/api/booking-context";
import { resolvePriceRulesWithPromotion } from "@/lib/api/promotion-pricing";
import { bookingIntentHash, buildPromotionSnapshot, persistedBookingResponse, type PersistedBookingResult } from "@/lib/api/promotion-snapshot";
import { wpAuthedFetch } from "@/lib/api/wp-auth";
import { formatIntermediateStops, intermediateStopsInputSchema } from "@/lib/booking-stops";
import { LEAD_MEASUREMENT_POLICY, normalizeAcquisition } from "@/lib/lead-measurement";

import { applyCoupon, CouponError } from "@/lib/api/coupon";

import { promotionCodeInput } from "@/lib/booking-promotion-code";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const bookingRequestSchema = z.object({
  promotionCode: promotionCodeInput.optional().transform((code) => code || undefined),
  couponQuoteKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
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
  acquisition: z.unknown().optional(),
});

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
  const idempotencyKey = request.headers.get("x-lead-idempotency-key") || randomUUID();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: "Mã gửi lại yêu cầu không hợp lệ." }, { status: 400 });
  }
  const { acquisition: clientAcquisition, ...bookingIntent } = data;
  const intentHash = bookingIntentHash(bookingIntent);
  // Authenticated lookup happens before CMS/resolvers. Fail closed on old backend.
  const replay = await wpAuthedFetch<{ found: boolean } & Partial<PersistedBookingResult>>("/gocar/v1/leads/replay", {
    method: "POST", body: { idempotency_key: idempotencyKey, intent_version: 2, intent_hash: intentHash },
  });
  if (!replay.ok) return NextResponse.json({ ok: false, error: replay.message }, { status: replay.status || 502 });
  if (replay.data?.found === true) {
    try {
      if (!replay.data.promotion_snapshot) throw new Error("snapshot_missing");
      return NextResponse.json(persistedBookingResponse(replay.data as PersistedBookingResult));
    }
    catch { return NextResponse.json({ ok: false, error: "Không xác nhận được bản đã lưu." }, { status: 502 }); }
  }
  if (replay.data?.found !== false) return NextResponse.json({ ok: false, error: "Không xác nhận được trạng thái yêu cầu." }, { status: 502 });

  const [routeContext, vehicleId] = await Promise.all([
    resolveRouteContext(data.routeId, data.route, Boolean(data.promotionCode)),
    resolveVehicleId(data.vehicleType, Boolean(data.promotionCode)),
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

  const priceContext = {
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
  };
  let evaluation = await resolvePriceRulesWithPromotion(priceContext);
  let couponReceipt;
  if (data.promotionCode) {
    try {
      const applied = await applyCoupon(data.promotionCode, evaluation, priceContext);
      if (!data.couponQuoteKey || data.couponQuoteKey !== applied.quote.quoteKey) {
        return NextResponse.json({ ok: false, error: "Giá hoặc điều kiện mã đã thay đổi. Hãy áp dụng lại mã và xác nhận giá mới.", quote: applied.quote }, { status: 409 });
      }
      evaluation = applied.evaluation; couponReceipt = applied.receipt;
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof CouponError ? error.message : "Chưa kiểm tra được mã khuyến mãi." }, { status: error instanceof CouponError ? error.status : 503 });
    }
  } else if (data.couponQuoteKey) {
    return NextResponse.json({ ok: false, error: "Xác nhận giá không có mã tương ứng." }, { status: 400 });
  }
  const priceRules = evaluation.pricing;
  const promotionSnapshot = buildPromotionSnapshot(evaluation, priceContext);
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
  if (couponReceipt) noteParts.push(`Mã khuyến mãi: ${couponReceipt.code}; giảm ${evaluation.promotion.discountAmount} VND; giá sau giảm ${evaluation.promotion.promotionalEstimatedTotal} VND.`);

  // Context is optional, sanitized and outside booking identity. Never infer a touch
  // from the API Referer, booking PII, an asserted source, channel or lead ID.
  const acquisition = normalizeAcquisition(clientAcquisition, process.env.LEAD_MEASUREMENT_POLICY === LEAD_MEASUREMENT_POLICY);

  const result = await wpAuthedFetch<PersistedBookingResult>("/gocar/v1/leads", {
    method: "POST",
    body: {
      idempotency_key: idempotencyKey,
      intent_version: 2, intent_hash: intentHash, promotion_snapshot: promotionSnapshot,
      acquisition,
      ...(couponReceipt ? { coupon_receipt: couponReceipt } : {}),
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

  if (!Number.isSafeInteger(result.data?.lead_id) || result.data.lead_id <= 0 || result.data.id !== result.data.lead_id) {
    return NextResponse.json({ ok: false, error: "Không xác nhận được mã yêu cầu từ hệ thống." }, { status: 502 });
  }

  if (!result.data.promotion_snapshot) return NextResponse.json({ ok: false, error: "Chưa xác nhận được bản giá đã lưu." }, { status: 502 });

  // WordPress owns the existing one-time mail hook. Reading its receipt cannot
  // send another email, including when this worker loses the create race.
  return NextResponse.json(persistedBookingResponse(result.data));
}
