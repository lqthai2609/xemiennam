import "server-only";
import type { PromotionResolution } from "./promotion-evaluator";
import { promotionTupleKey, promotionWindow, type PromotionTuple } from "./promotion-model";
import type { PromotionPriceView } from "@/types/promotion-price";

export interface PromotionDisplayContext {
  tuple: PromotionTuple;
  purpose: PromotionPriceView["purpose"];
  mode: PromotionPriceView["mode"];
  amount?: number;
  offerEligible: boolean;
}
const money = (n: unknown, min = 1): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= min;
const messages: Partial<Record<PromotionPriceView["state"], string>> = {
  scheduled: "Chương trình chưa bắt đầu.", expired: "Chương trình đã kết thúc.",
  ambiguous_promotion: "Ưu đãi cần được xác nhận; hiện áp dụng giá chưa giảm.",
  context_missing: "Ưu đãi được xác nhận theo điều kiện chuyến đi.",
  pricing_contact: "Liên hệ để xác nhận giá và điều kiện chuyến đi.",
  pricing_disabled: "Tổ hợp này hiện chưa nhận đặt chuyến.",
};

/** No discount calculation here: validate and project the evaluator's exact pair. */
export function buildPromotionPriceView(result: PromotionResolution, context: PromotionDisplayContext, now: number): PromotionPriceView {
  const fixed = context.mode === "fixed" && money(context.amount);
  const view: PromotionPriceView = {
    tuple: { ...context.tuple }, purpose: context.purpose,
    mode: context.mode === "disabled" ? "disabled" : fixed ? "fixed" : "contact",
    state: result.reason, offerEligible: context.offerEligible && fixed && context.purpose === "base_catalog",
    ...(fixed ? { originalAmount: context.amount, amount: context.amount } : {}),
  };
  const finish = (state = view.state) => ({ ...view, state, ...(messages[state] ? { message: messages[state] } : {}) });
  if (view.mode !== "fixed") return finish(view.mode === "disabled" ? "pricing_disabled" : "pricing_contact");
  const sourceAmount = context.purpose === "base_catalog" ? result.basePrice : result.estimatedTotalBeforePromotion;
  if (result.version !== 1 || result.priceCurrency !== "VND" || !result.tuple
    || promotionTupleKey(result.tuple) !== promotionTupleKey(context.tuple)
    || result.priceUnit !== context.tuple.package_key || sourceAmount !== context.amount) return finish("scope_mismatch");
  if (result.pricingMode !== "fixed" || result.reason !== "applied") return finish();
  if (context.purpose === "base_catalog" && result.requiresTripContext) return finish("context_missing");
  if (!Number.isSafeInteger(now) || !result.validity || !money(result.promotionalEstimatedTotal)) return finish("invalid_config");
  let window;
  try { window = promotionWindow(result.validity); } catch { return finish("invalid_config"); }
  const evaluatedAt = Date.parse(result.evaluationTime);
  if (!Number.isFinite(evaluatedAt) || evaluatedAt > now) return finish("invalid_config");
  if (now < window.startAt) return finish("scheduled");
  if (now >= window.endExclusive) return finish("expired");
  const boundary = result.nextBoundaryAt ? Date.parse(result.nextBoundaryAt) : window.endExclusive;
  if (!Number.isFinite(boundary)) return finish("invalid_config");
  // Short lease also covers time-dependent predicates and browser-held responses.
  const expires = Math.min(window.endExclusive, boundary, evaluatedAt + 60_000);
  if (expires <= now) return finish("expired");
  if (result.promotionStatus !== "benefit" && context.purpose === "base_catalog" && result.priceLayer !== "base_price") return finish("context_missing");
  if (result.promotionStatus === "benefit") {
    if (!result.publicBenefit || result.discountAmount !== 0 || result.promotionalEstimatedTotal !== result.estimatedTotalBeforePromotion) return finish("invalid_config");
  } else {
    const { comparisonBefore: before, comparisonAfter: after, discountAmount: discount, priceLayer: layer } = result;
    if (result.promotionStatus !== "applied" || !layer || !money(before) || !money(after, layer === "surcharge" ? 0 : 1)
      || !money(discount) || BigInt(before) - BigInt(after) !== BigInt(discount)
      || !money(result.estimatedTotalBeforePromotion)
      || BigInt(result.estimatedTotalBeforePromotion) - BigInt(result.promotionalEstimatedTotal) !== BigInt(discount)
      || (layer === "base_price" && before !== result.basePrice)
      || (layer === "estimated_total" && (before !== result.estimatedTotalBeforePromotion || after !== result.promotionalEstimatedTotal))) return finish("invalid_config");
    view.amount = context.purpose === "base_catalog" ? after : result.promotionalEstimatedTotal;
  }
  view.claim = {
    ...(result.promotionStatus === "benefit" ? { benefit: { ...result.publicBenefit! } } : {
      layer: result.priceLayer, layerLabel: result.priceLayer === "base_price" ? "Giá cơ bản" : result.priceLayer === "estimated_total" ? "Tổng chuyến dự kiến" : "Khoản phụ phí được miễn",
      before: result.comparisonBefore, after: result.comparisonAfter,
    }),
    discountAmount: result.discountAmount!, conditions: [...(result.conditionsSummary ?? [])],
    startDate: result.validity.start_date, endDate: result.validity.end_date,
    validFrom: new Date(window.startAt).toISOString(), validThrough: new Date(window.endExclusive - 1).toISOString(),
    expiresAt: new Date(expires).toISOString(),
  };
  return view;
}
