import "server-only";
import { wpAuthedFetch } from "./wp-auth";
import { fetchRawVehicles } from "./raw";
import { evaluatePromotionRules, type PromotionEvaluation } from "./promotion-evaluator";
import { promotionReferenceFromSnapshot } from "./promotion-reference";
import type { PromotionModel } from "./promotion-model";
import type { PriceRuleContext } from "./price-rules";
import { bookingIntentHash } from "./promotion-snapshot";
import type { CouponQuote, CouponReceipt } from "@/types/coupon";

export class CouponError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
const reasons: Record<string, string> = {
  scope_mismatch: "Mã không áp dụng cho chuyến, ngày đi hoặc mức giá đã chọn.",
  context_missing: "Vui lòng chọn ngày giờ đi để kiểm tra mã.",
  expired: "Mã khuyến mãi đã hết hạn.", scheduled: "Mã chưa đến thời gian áp dụng.",
  pricing_contact: "Chuyến cần tư vấn báo giá, chưa thể giảm tự động.",
  pricing_disabled: "Chuyến chưa được phục vụ.",
};

/** Reuse the existing evaluator; a coupon selects exactly one private Promotion Model. */
export async function applyCoupon(code: string, base: PromotionEvaluation, context: PriceRuleContext) {
  code = code.trim().toUpperCase();
  if (process.env.ALO_COUPONS_ENABLED !== "true") throw new CouponError("Tính năng áp dụng mã chưa được mở.", 503);
  if (!context.route || !context.vehicleId || !base.promotion.tuple) throw new CouponError("Vui lòng chọn tuyến, loại xe và gói chuyến có giá.");
  if (base.promotion.promotionStatus !== "none") throw new CouponError("Chuyến đã có ưu đãi khác, chưa thể cộng thêm mã.");
  const lookup = await wpAuthedFetch<{ id: number; code: string; model: PromotionModel; cap_vnd: number | null }>("/gocar/v1/coupons/lookup", { method: "POST", body: { code } });
  if (!lookup.ok) throw new CouponError(lookup.status >= 500 || lookup.status === 0 ? "Chưa kiểm tra được mã khuyến mãi. Vui lòng thử lại." : lookup.message, lookup.status || 503);
  const source = lookup.data;
  if (!Number.isSafeInteger(source.id) || source.id <= 0 || source.code !== code || !["fixed_discount", "percent_discount"].includes(source.model?.discount?.kind) || source.model.discount.target !== "base_price") throw new CouponError("Dữ liệu mã chưa hợp lệ.", 502);
  const vehicles = await fetchRawVehicles(0);
  const result = evaluatePromotionRules(base.pricing, { tuple: base.promotion.tuple, departureDate: context.departureDate, departureTime: context.departureTime }, {
    records: [{ promotion_id: source.id, model: source.model }], reference: promotionReferenceFromSnapshot([context.route], vehicles),
  }, Date.now());
  const m = result.promotion;
  if (m.promotionStatus !== "applied") { console.warn("[coupon] eligibility rejected:", m.reason); }
  if (m.promotionStatus !== "applied") throw new CouponError(reasons[m.reason] || "Mã không còn đủ điều kiện cho chuyến đã chọn.");
  if (source.model.discount.kind === "percent_discount") {
    if (!Number.isSafeInteger(source.cap_vnd) || source.cap_vnd! < 1) throw new CouponError("Thiếu mức giảm tối đa.", 502);
    m.discountAmount = Math.min(m.discountAmount!, source.cap_vnd!);
    m.promotionalEstimatedTotal = result.pricing.estimatedTotal! - m.discountAmount;
    m.comparisonAfter = result.pricing.basePrice! - m.discountAmount;
  }
  const quoteKey = bookingIntentHash({ version: 1, code, couponId: source.id, revision: m.revision,
    tuple: m.tuple, pricing: result.pricing, discount: m.discountAmount, after: m.promotionalEstimatedTotal,
    departureDate: context.departureDate || "", departureTime: context.departureTime || "",
    pickup: context.pickup?.id, dropoff: context.dropoff?.id, quantities: context.quantities,
  });
  const receipt: CouponReceipt = { coupon_id: source.id, code, revision: m.revision!, quote_key: quoteKey };
  const quote: CouponQuote = { code, quoteKey, basePrice: result.pricing.basePrice!, before: result.pricing.estimatedTotal!, discount: m.discountAmount!, after: m.promotionalEstimatedTotal! };
  return { evaluation: result, receipt, quote };
}
