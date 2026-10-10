import type { EmptyLegModel, EmptyLegResolver, EmptyLegScope, EmptyLegValidation } from "@/types/empty-leg";

export const EMPTY_LEG_MODEL_VERSION = 1;
export const EMPTY_LEG_COMMERCIAL_ENABLED = false;
export const EMPTY_LEG_INDEX_POLICY = Object.freeze({ robots: "noindex,nofollow", sitemap: false, public_url: null });
const max = Number.MAX_SAFE_INTEGER;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: unknown, required: string[]): v is Record<string, unknown> => object(v) && Object.keys(v).length === required.length && required.every((k) => Object.hasOwn(v, k));
const integer = (v: unknown, min = 1) => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v: unknown) => typeof v === "string" && v.trim() === v && [...v].length > 0 && [...v].length <= 500 && !/[<>\x00-\x1f\x7f]/.test(v);

function instant(v: unknown): number | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) || v < "0001-01-01T00:00:00Z") return null;
  const n = Date.parse(v);
  return Number.isFinite(n) && new Date(n).toISOString().replace(".000Z", "Z") === v ? n : null;
}

/** Always Vietnam wall time; no browser/server timezone or inferred travel time. */
export function emptyLegDepartureAt(v: unknown): number | null {
  if (!keys(v, ["date", "time", "timezone"]) || v.timezone !== "Asia/Ho_Chi_Minh" || typeof v.date !== "string" || typeof v.time !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || v.date < "0001-01-01" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)) return null;
  const n = Date.parse(`${v.date}T${v.time}:00+07:00`);
  return Number.isFinite(n) && new Date(n + 7 * 3600000).toISOString().slice(0, 16) === `${v.date}T${v.time}` ? n : null;
}

export function createEmptyLegDraft(): EmptyLegModel {
  return { model_version: 1, revision: 1, status: "draft", approval: { status: "draft", source_ref: null }, scope: null, departure: null,
    prices: { normal_price_vnd: null, special_price_vnd: null, currency: "VND", basis: "base_price", source: "pricing_v2_snapshot" }, valid_from: null, expires_at: null };
}

/** Schema + reference checks. No coercion, mutation, activation, legacy backfill or price recomputation. */
export function validateEmptyLegModel(input: unknown, reference?: EmptyLegResolver): EmptyLegValidation {
  if (!keys(input, ["model_version", "revision", "status", "approval", "scope", "departure", "prices", "valid_from", "expires_at"])) return { valid: false, errors: ["model"] };
  const errors: string[] = [];
  if (input.model_version !== 1) errors.push("model_version");
  if (!integer(input.revision)) errors.push("revision");
  if (!["draft", "inactive", "available", "reserved", "completed", "cancelled"].includes(input.status as string)) errors.push("status");
  const approvalOk = keys(input.approval, ["status", "source_ref"]) && ["draft", "confirmed", "rejected"].includes(input.approval.status as string) && (input.approval.source_ref === null || text(input.approval.source_ref)) && (input.approval.status !== "confirmed" || input.approval.source_ref !== null);
  if (!approvalOk) errors.push("approval");
  const confirmed = approvalOk && (input.approval as Record<string, unknown>).status === "confirmed";
  if (["available", "reserved", "completed"].includes(input.status as string) && !confirmed) errors.push("status");
  const scope = input.scope;
  const scopeOk = keys(scope, ["route_id", "direction", "vehicle_id", "package_key", "origin_location_id", "destination_location_id", "readiness_version"]) && [scope.route_id, scope.vehicle_id, scope.origin_location_id, scope.destination_location_id, scope.readiness_version].every((n) => integer(n)) && ["outbound", "inbound"].includes(scope.direction as string) && scope.package_key === "one_way" && scope.origin_location_id !== scope.destination_location_id;
  if (scope !== null && !scopeOk) errors.push("scope");
  const departure = emptyLegDepartureAt(input.departure);
  if (input.departure !== null && departure === null) errors.push("departure");
  const prices = input.prices;
  const pricesOk = keys(prices, ["normal_price_vnd", "special_price_vnd", "currency", "basis", "source"]) && prices.currency === "VND" && prices.basis === "base_price" && prices.source === "pricing_v2_snapshot" && [prices.normal_price_vnd, prices.special_price_vnd].every((n) => n === null || integer(n));
  if (!pricesOk) errors.push("prices");
  else if (prices.normal_price_vnd !== null && prices.special_price_vnd !== null && (prices.special_price_vnd as number) > (prices.normal_price_vnd as number)) errors.push("prices.special_price_vnd");
  const from = instant(input.valid_from), expiry = instant(input.expires_at);
  if (input.valid_from !== null && from === null) errors.push("valid_from");
  if (input.expires_at !== null && expiry === null) errors.push("expires_at");
  if (from !== null && expiry !== null && from >= expiry) errors.push("expires_at");
  if (expiry !== null && departure !== null && expiry > departure) errors.push("expires_at");
  if (confirmed && (!scopeOk || departure === null || !pricesOk || prices.normal_price_vnd === null || prices.special_price_vnd === null || from === null || expiry === null)) errors.push("confirmed_complete");
  if (scopeOk) {
    let ref;
    try { ref = reference?.(scope as unknown as EmptyLegScope); } catch { /* Fail closed if the authoritative read fails. */ }
    if (!ref || ref.exists !== true || ref.originLocationId !== scope.origin_location_id || ref.destinationLocationId !== scope.destination_location_id) errors.push("reference");
    else if (confirmed && (ref.activationReady !== true || ref.prelaunch !== false || ref.mappingBlocked !== false || ref.readinessVersion !== scope.readiness_version || ref.pricingMode !== "fixed" || !integer(ref.normalPriceVnd) || !pricesOk || ref.normalPriceVnd !== prices.normal_price_vnd)) errors.push("reference_confirmation");
  }
  return errors.length ? { valid: false, errors: [...new Set(errors)] } : { valid: true, model: structuredClone(input) as unknown as EmptyLegModel };
}

/** Model eligibility only; not a promise of an assigned car, inventory reservation or booking. */
export function assessEmptyLeg(input: unknown, reference?: EmptyLegResolver, now = Date.now()) {
  const checked = validateEmptyLegModel(input, reference);
  let state: string = "invalid";
  if (checked.valid && Number.isFinite(now)) {
    const m = checked.model;
    if (["draft", "inactive", "reserved", "completed", "cancelled"].includes(m.status)) state = m.status;
    else if (now >= (instant(m.expires_at) as number) || now >= (emptyLegDepartureAt(m.departure) as number)) state = "expired";
    else if (now < (instant(m.valid_from) as number)) state = "not_yet_available";
    else state = "eligible";
  }
  return { state, sellable: false as const, commercial_enabled: EMPTY_LEG_COMMERCIAL_ENABLED, ...EMPTY_LEG_INDEX_POLICY };
}
