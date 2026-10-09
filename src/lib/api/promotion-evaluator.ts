import "server-only";
import { isPromotionDate, promotionTupleKey, promotionWindow, validatePromotionModel,
  type PromotionModel, type PromotionReference, type PromotionTuple } from "./promotion-model";
import type { PriceRulesResolution } from "./price-rules";

export type PromotionReason = "none" | "unapproved" | "disabled" | "invalid_config" | "scheduled" | "expired"
  | "scope_mismatch" | "reference_missing" | "context_missing" | "prelaunch_blocked" | "mapping_blocked"
  | "pricing_contact" | "pricing_disabled" | "ambiguous_promotion" | "applied";
export interface PromotionRecord { promotion_id: number; model: unknown }
/** Only server-fetched current CMS references belong here; never request JSON. */
export interface PromotionSource {
  records: PromotionRecord[];
  reference: (tuple: PromotionTuple, model: PromotionModel) => PromotionReference;
}
export interface PromotionEvaluationContext {
  tuple?: PromotionTuple;
  departureDate?: string;
  departureTime?: string;
}
export interface PromotionResolution {
  version: 1;
  tuple?: PromotionTuple;
  pricingMode: PriceRulesResolution["mode"];
  pricingReason: PriceRulesResolution["reason"];
  priceCurrency: "VND";
  priceUnit?: string;
  promotionStatus: "none" | "applied" | "benefit" | "ambiguous";
  reason: PromotionReason;
  basePrice?: number;
  estimatedTotalBeforePromotion?: number;
  discountAmount?: number;
  promotionalEstimatedTotal?: number;
  promotion_id?: number;
  revision?: number;
  target?: PromotionModel["discount"]["target"];
  priceLayer?: "base_price" | "estimated_total" | "surcharge";
  comparisonBefore?: number;
  comparisonAfter?: number;
  validity?: PromotionModel["window"];
  conditionsSummary?: string[];
  publicBenefit?: { title: string; rule: string };
  evaluationTime: string;
  /** Do not cache a claim at or beyond this boundary. UI enforcement belongs to Day 44. */
  nextBoundaryAt?: string;
}
export interface PromotionEvaluation {
  pricing: PriceRulesResolution;
  promotion: PromotionResolution;
  /** Private diagnostic channel; never serialize the whole evaluation publicly. */
  diagnostics: { promotion_id?: number; reason: PromotionReason }[];
}
const safeMoney = (value: unknown, minimum = 0): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
const safeId = (value: unknown): value is number => safeMoney(value, 1);
function validTuple(value: PromotionTuple | undefined): value is PromotionTuple {
  return Boolean(value && safeId(value.route_id) && safeId(value.vehicle_id) && ["outbound", "inbound"].includes(value.direction) && /^[a-z0-9_-]{1,80}$/.test(value.package_key));
}
function charge(mode: string, amount: number | undefined): bigint | undefined {
  if (mode === "none") return amount === undefined || amount === 0 ? BigInt(0) : undefined;
  if (mode === "fixed" && safeMoney(amount, 1)) return BigInt(amount);
  return undefined;
}
/** A malformed base/additive price is a pricing error, never repaired by a promotion. */
export function safePromotionPricing(price: PriceRulesResolution): PriceRulesResolution {
  const withoutTotal = { ...price };
  delete withoutTotal.estimatedTotal;
  if (price.mode !== "fixed") return withoutTotal;
  const surcharge = charge(price.surcharge.mode, price.surcharge.amount);
  const condition = charge(price.condition.mode, price.condition.amount);
  const modifiers = price.modifiers.map((item) => charge(item.mode, item.amount));
  if (price.currency !== "VND" || !safeMoney(price.basePrice, 1) || !safeMoney(price.estimatedTotal, 1)
    || surcharge === undefined || condition === undefined || modifiers.some((amount) => amount === undefined)) {
    return { ...withoutTotal, mode: "contact", reason: "condition_contact" };
  }
  const modifierTotal = modifiers.reduce<bigint>((sum, amount) => sum + amount!, BigInt(0));
  const total = BigInt(price.basePrice) + surcharge + condition + modifierTotal;
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total !== BigInt(price.estimatedTotal)
    || (price.modifierAmount !== undefined && (!safeMoney(price.modifierAmount) || BigInt(price.modifierAmount) !== modifierTotal))) {
    return { ...withoutTotal, mode: "contact", reason: "condition_contact" };
  }
  return price;
}
export function promotionWithoutApplication(price: PriceRulesResolution, context: PromotionEvaluationContext,
  evaluationTime: number, reason: PromotionReason): PromotionEvaluation {
  const pricing = safePromotionPricing(price);
  return { pricing, diagnostics: [], promotion: {
    version: 1, ...(validTuple(context.tuple) ? { tuple: { ...context.tuple }, priceUnit: context.tuple.package_key } : {}),
    pricingMode: pricing.mode, pricingReason: pricing.reason, priceCurrency: "VND", promotionStatus: "none", reason,
    ...(safeMoney(pricing.basePrice, 1) ? { basePrice: pricing.basePrice } : {}),
    ...(pricing.mode === "fixed" ? { estimatedTotalBeforePromotion: pricing.estimatedTotal } : {}),
    evaluationTime: new Date(evaluationTime).toISOString(),
  } };
}
function eligibleAmount(model: PromotionModel, price: PriceRulesResolution): number | undefined {
  if (model.discount.target === "estimated_total") return price.estimatedTotal;
  if (model.discount.kind !== "free_surcharge") return price.basePrice;
  const discount = model.discount;
  const components = price.surcharge.components;
  if (!components || price.surcharge.mode !== "fixed" || !safeMoney(price.surcharge.amount, 1)) return undefined;
  if (components.some((item) => !safeMoney(item.amount) || !safeId(item.policyVersion) || !item.applicationKey
    || (item.mode === "none" && item.amount !== 0) || (item.mode === "fixed" && item.amount <= 0)
    || !["none", "fixed"].includes(item.mode))
    || new Set(components.map((item) => item.applicationKey)).size !== components.length
    || components.reduce((sum, item) => sum + BigInt(item.amount), BigInt(0)) !== BigInt(price.surcharge.amount)) return undefined;
  // Same named rule charged twice is ambiguous. No guessed aggregate waiver.
  const matches = components.filter((item) => item.ruleKey === discount.rule_key);
  if (matches.length !== 1 || matches[0].mode !== "fixed" || matches[0].policyVersion !== discount.policy_version) return undefined;
  return matches[0].amount;
}
function conditionReason(model: PromotionModel, context: PromotionEvaluationContext, now: number, eligible: number): PromotionReason | undefined {
  for (const condition of model.conditions) {
    if (condition.kind === "min_eligible_amount") {
      if (eligible < condition.amount_vnd) return "scope_mismatch";
      continue;
    }
    if (!context.departureDate || !isPromotionDate(context.departureDate)) return "context_missing";
    if (condition.kind === "departure_date_range" && (context.departureDate < condition.start_date || context.departureDate > condition.end_date)) return "scope_mismatch";
    if (condition.kind === "departure_weekdays" && !condition.days.includes(new Date(`${context.departureDate}T00:00:00Z`).getUTCDay())) return "scope_mismatch";
    if (condition.kind === "advance_booking_minutes") {
      if (!context.departureTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(context.departureTime)) return "context_missing";
      const departure = Date.parse(`${context.departureDate}T${context.departureTime}:00+07:00`);
      if (BigInt(departure) - BigInt(now) < BigInt(condition.minimum) * BigInt(60000)) return "scope_mismatch";
    }
  }
  return undefined;
}
function summaries(model: PromotionModel): string[] {
  return model.conditions.map((condition) => {
    switch (condition.kind) {
      case "departure_date_range": return `Ngày đi từ ${condition.start_date} đến ${condition.end_date}.`;
      case "departure_weekdays": return `Ngày đi trong tuần: ${condition.days.map((day) => day === 0 ? "Chủ nhật" : `Thứ ${day + 1}`).join(", ")}.`;
      case "advance_booking_minutes": return `Đặt trước ít nhất ${condition.minimum} phút.`;
      case "min_eligible_amount": return `Số tiền đủ điều kiện ít nhất ${condition.amount_vnd} VND.`;
    }
  });
}
/** Internal server kernel. Clock injection is only for deterministic tests; no HTTP endpoint. */
export function evaluatePromotionRules(price: PriceRulesResolution, context: PromotionEvaluationContext,
  source: PromotionSource, now: number): PromotionEvaluation {
  if (!Number.isSafeInteger(now) || !Number.isFinite(new Date(now).getTime())) throw new Error("invalid_server_clock");
  const result = promotionWithoutApplication(price, context, now, "none");
  const pricing = result.pricing;
  if (pricing.mode !== "fixed") {
    result.promotion.reason = pricing.mode === "disabled" ? "pricing_disabled" : "pricing_contact";
    return result;
  }
  if (!validTuple(context.tuple)) { result.promotion.reason = "context_missing"; return result; }
  const tuple = context.tuple;
  const candidates: { record: PromotionRecord; model: PromotionModel; amount: number; eligible: number; specificity: number }[] = [];
  const seen = new Set<number>();
  let nextBoundary = Infinity;
  for (const record of source.records) {
    const reject = (reason: PromotionReason) => result.diagnostics.push({ ...(safeId(record.promotion_id) ? { promotion_id: record.promotion_id } : {}), reason });
    if (!safeId(record.promotion_id) || seen.has(record.promotion_id)) {
      // Duplicate records must never affect selection based on arrival order.
      result.promotion.reason = "invalid_config"; return result;
    }
    seen.add(record.promotion_id);
    let validated;
    try { validated = validatePromotionModel(record.model, source.reference); }
    catch { reject("reference_missing"); continue; }
    if (!validated.valid) {
      const codes = validated.errors.map((error) => error.code);
      reject(codes.includes("prelaunch_blocked") ? "prelaunch_blocked" : codes.includes("reference_missing") ? "reference_missing"
        : codes.includes("mapping_blocked") ? "mapping_blocked" : codes.includes("unapproved") ? "unapproved" : "invalid_config");
      continue;
    }
    const model = validated.model;
    if (model.approval.status !== "approved") { reject("unapproved"); continue; }
    if (!model.enabled) { reject("disabled"); continue; }
    if (Date.parse(model.approval.approved_at!) > now || Date.parse(model.activation!.approved_at) > now) { reject("unapproved"); continue; }
    if (!model.scopes.some((scope) => promotionTupleKey(scope) === promotionTupleKey(tuple))) { reject("scope_mismatch"); continue; }
    const window = promotionWindow(model.window);
    for (const boundary of [window.startAt, window.endExclusive]) if (boundary > now) nextBoundary = Math.min(nextBoundary, boundary);
    if (now < window.startAt) { reject("scheduled"); continue; }
    if (now >= window.endExclusive) { reject("expired"); continue; }
    const eligible = eligibleAmount(model, pricing);
    if (!safeMoney(eligible, 1)) { reject(model.discount.kind === "free_surcharge" ? "reference_missing" : "invalid_config"); continue; }
    const failed = conditionReason(model, context, now, eligible);
    if (failed) { reject(failed); continue; }
    let amount = BigInt(0);
    const discount = model.discount;
    switch (discount.kind) {
      case "fixed_discount": amount = BigInt(discount.amount_vnd); break;
      case "percent_discount": amount = BigInt(eligible) * BigInt(discount.rate_bps) / BigInt(10000); break;
      case "special_price": amount = BigInt(pricing.basePrice!) - BigInt(discount.amount_vnd); break;
      case "free_surcharge": amount = BigInt(Math.min(eligible, discount.cap_vnd ?? eligible)); break;
      case "benefit": break;
    }
    const final = BigInt(pricing.estimatedTotal!) - amount;
    if (discount.kind !== "benefit" && (amount <= BigInt(0) || amount > BigInt(Number.MAX_SAFE_INTEGER)
      || (discount.kind !== "free_surcharge" && amount >= BigInt(eligible)) || final <= BigInt(0))) { reject("invalid_config"); continue; }
    candidates.push({ record, model, eligible, amount: Number(amount), specificity: Object.values(model.scope_policy).filter((axis) => axis === "selected").length });
    result.diagnostics.push({ promotion_id: record.promotion_id, reason: "applied" });
  }
  if (Number.isFinite(nextBoundary)) result.promotion.nextBoundaryAt = new Date(nextBoundary).toISOString();
  if (!candidates.length) {
    // A single rejection has a useful public reason; multiple private campaigns stay opaque.
    result.promotion.reason = result.diagnostics.length === 1 ? result.diagnostics[0].reason : "none";
    return result;
  }
  const priority = Math.max(...candidates.map((item) => item.model.priority));
  const prioritized = candidates.filter((item) => item.model.priority === priority);
  const specificity = Math.max(...prioritized.map((item) => item.specificity));
  const selected = prioritized.filter((item) => item.specificity === specificity);
  if (selected.length !== 1) {
    result.promotion.promotionStatus = "ambiguous"; result.promotion.reason = "ambiguous_promotion";
    result.diagnostics = selected.map((item) => ({ promotion_id: item.record.promotion_id, reason: "ambiguous_promotion" }));
    return result;
  }
  const { record, model, amount, eligible } = selected[0];
  const discount = model.discount;
  result.promotion = { ...result.promotion, promotionStatus: discount.kind === "benefit" ? "benefit" : "applied", reason: "applied",
    promotion_id: record.promotion_id, revision: model.revision, target: discount.target, validity: { ...model.window },
    conditionsSummary: summaries(model), discountAmount: amount,
    promotionalEstimatedTotal: Number(BigInt(pricing.estimatedTotal!) - BigInt(amount)),
    ...(discount.kind === "benefit" ? { publicBenefit: { title: discount.title, rule: discount.rule } }
      : { priceLayer: discount.target, comparisonBefore: eligible, comparisonAfter: eligible - amount }),
  };
  return result;
}
