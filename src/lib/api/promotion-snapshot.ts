import "server-only";
import { createHash } from "node:crypto";
import type { PromotionEvaluation } from "./promotion-evaluator";
import type { PriceRuleContext } from "./price-rules";

/** Hash only validated request intent, never a client hash or server-derived price. */
export function bookingIntentHash(intent: unknown): string {
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
    return value;
  }
  return createHash("sha256").update(JSON.stringify(canonical(intent))).digest("hex");
}

/** Private, versioned estimate. No acquisition, address, PII, or private diagnostics. */
export function buildPromotionSnapshot(result: PromotionEvaluation, context: PriceRuleContext) {
  const { pricing: p, promotion: m } = result;
  const version = (v: unknown) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : 0;
  const snapshot = {
    snapshot_version: 1, evaluator_version: 1, pricing_version: 2, estimate_only: true,
    currency: "VND", timezone: "Asia/Ho_Chi_Minh", evaluation_time: m.evaluationTime,
    tuple: m.tuple ? { ...m.tuple } : null,
    pricing: {
      mode: p.mode, reason: p.reason, base_price: p.basePrice ?? null,
      estimated_total: p.estimatedTotal ?? null, modifier_amount: p.modifierAmount ?? null,
      surcharge: { mode: p.surcharge.mode, amount: p.surcharge.amount ?? null, reason: p.surcharge.reason,
        rule_keys: [...p.surcharge.matchedRuleKeys], components: (p.surcharge.components ?? []).map(c => ({
          rule_key: c.ruleKey ?? null, policy_version: c.policyVersion, application_key: c.applicationKey, mode: c.mode, amount: c.amount,
        })) },
      modifiers: p.modifiers.map(c => ({ type: c.type, quantity: c.quantity, billable_units: c.billableUnits,
        mode: c.mode, amount: c.amount ?? null, rule_key: c.ruleKey ?? null, reason: c.reason })),
      condition: { mode: p.condition.mode, amount: p.condition.amount ?? null, rule_key: p.condition.ruleKey ?? null,
        reason: p.condition.reason, policy_version: p.condition.policyVersion ?? 0, timezone: p.condition.timezone ?? "" },
    },
    promotion: {
      status: m.promotionStatus, reason: m.reason, promotion_id: m.promotion_id ?? null, revision: m.revision ?? null,
      type: m.discountKind ?? null, target: m.target ?? null, discount_amount: m.discountAmount ?? null,
      promotional_estimated_total: m.promotionalEstimatedTotal ?? null, window: m.validity ? { ...m.validity } : null,
      conditions: [...(m.conditionsSummary ?? [])], requires_trip_context: m.requiresTripContext ?? false,
      benefit: m.publicBenefit ? { ...m.publicBenefit } : null,
    },
    rule_versions: {
      surcharge: version(context.route?.meta.surcharge_policy_version),
      modifier: version(context.route?.meta.price_modifier_policy_version),
      condition: version(context.route?.meta.price_condition_policy_version),
    },
  };
  // Detach from CMS/evaluation objects before persisting, including nested window data.
  return JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
}
export type PromotionSnapshot = ReturnType<typeof buildPromotionSnapshot>;
export interface PersistedBookingResult { id: number; lead_id: number; replayed: boolean; promotion_snapshot?: PromotionSnapshot | null }
export function persistedBookingResponse(result: PersistedBookingResult, notificationSent = false) {
  if (!Number.isSafeInteger(result.lead_id) || result.lead_id <= 0 || result.id !== result.lead_id) throw new Error("invalid_persisted_lead");
  return { ok: true, id: result.lead_id, leadId: result.lead_id, notificationSent: result.replayed ? false : notificationSent,
    replayed: result.replayed, promotionSnapshot: result.promotion_snapshot ?? null };
}
