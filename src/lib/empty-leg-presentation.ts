import { emptyLegDepartureAt } from "@/lib/empty-leg";
import type { EmptyLegModel } from "@/types/empty-leg";

export type EmptyLegCard = {
  id: number; revision: number; origin: string; destination: string; vehicle: string;
  direction: "outbound" | "inbound"; package_key: "one_way"; departure: NonNullable<EmptyLegModel["departure"]>;
  valid_from: string; expires_at: string; normal_price_vnd: number; special_price_vnd: number;
  currency: "VND"; basis: "base_price";
};
export type EmptyLegPresentation = { contract_version: 1; server_now: string; lease_ms: number; commercial_enabled: false; sellable: false; items: EmptyLegCard[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: unknown, names: string[]): v is Record<string, unknown> => object(v) && Object.keys(v).length === names.length && names.every((n) => Object.hasOwn(v, n));
const positive = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
function instant(v: unknown): number {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v)) return NaN;
  const n = Date.parse(v);
  return Number.isFinite(n) && new Date(n).toISOString().replace(".000Z", "Z") === v ? n : NaN;
}
const label = (v: unknown) => typeof v === "string" && v.trim() === v && v.length > 0 && [...v].length <= 500 && !/[<>\x00-\x1f\x7f]/.test(v);

/** Validate a projection, never evaluate business eligibility from browser declarations. */
export function parseEmptyLegPresentation(v: unknown): EmptyLegPresentation | null {
  if (!exact(v, ["contract_version", "server_now", "lease_ms", "commercial_enabled", "sellable", "items"]) || v.contract_version !== 1 || v.commercial_enabled !== false || v.sellable !== false || !Number.isFinite(instant(v.server_now)) || !positive(v.lease_ms) || v.lease_ms > 15000 || !Array.isArray(v.items) || v.items.length > 50) return null;
  const ids = new Set<number>();
  for (const card of v.items) {
    if (!exact(card, ["id", "revision", "origin", "destination", "vehicle", "direction", "package_key", "departure", "valid_from", "expires_at", "normal_price_vnd", "special_price_vnd", "currency", "basis"]) || !positive(card.id) || ids.has(card.id) || !positive(card.revision) || ![card.origin, card.destination, card.vehicle].every(label) || !["outbound", "inbound"].includes(card.direction as string) || card.package_key !== "one_way" || card.currency !== "VND" || card.basis !== "base_price" || !positive(card.normal_price_vnd) || !positive(card.special_price_vnd) || card.special_price_vnd > card.normal_price_vnd) return null;
    const from = instant(card.valid_from), expiry = instant(card.expires_at), departure = emptyLegDepartureAt(card.departure);
    if (!Number.isFinite(from) || !Number.isFinite(expiry) || departure === null || from >= expiry || expiry > departure) return null;
    ids.add(card.id);
  }
  return structuredClone(v) as unknown as EmptyLegPresentation;
}
/** Add full request duration conservatively; never trust the device wall clock. */
export function visibleEmptyLegCards(data: EmptyLegPresentation, requestStarted: number, monotonicNow: number): EmptyLegCard[] {
  const elapsed = monotonicNow - requestStarted;
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= data.lease_ms) return [];
  const now = instant(data.server_now) + elapsed + 1000;
  return data.items.filter((card) => now >= instant(card.valid_from) && now < instant(card.expires_at) && now < (emptyLegDepartureAt(card.departure) ?? -Infinity));
}
/** Bound the next update by expiry and freshness; long durations cannot overflow setTimeout. */
export function presentationTick(data: EmptyLegPresentation, requestStarted: number, monotonicNow: number): number {
  const elapsed = monotonicNow - requestStarted, now = instant(data.server_now) + elapsed + 1000;
  const deadlines = [data.lease_ms - elapsed, ...data.items.map((c) => instant(c.expires_at) - now)].filter((n) => n > 0);
  return Math.max(1, Math.min(1000, ...deadlines));
}
