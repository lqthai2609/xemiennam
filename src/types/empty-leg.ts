/** Day 50: operational inventory; never a Pricing V2 row or promotion. */
export type EmptyLegStatus = "draft" | "inactive" | "available" | "reserved" | "completed" | "cancelled";
export interface EmptyLegScope {
  route_id: number;
  direction: "outbound" | "inbound";
  vehicle_id: number;
  package_key: "one_way";
  origin_location_id: number;
  destination_location_id: number;
  readiness_version: number;
}
export interface EmptyLegModel {
  model_version: 1;
  revision: number;
  status: EmptyLegStatus;
  approval: { status: "draft" | "confirmed" | "rejected"; source_ref: string | null };
  scope: EmptyLegScope | null;
  departure: { date: string; time: string; timezone: "Asia/Ho_Chi_Minh" } | null;
  prices: { normal_price_vnd: number | null; special_price_vnd: number | null; currency: "VND"; basis: "base_price"; source: "pricing_v2_snapshot" };
  valid_from: string | null;
  expires_at: string | null;
}
/** A fresh authoritative reference, not client declarations of readiness. */
export interface EmptyLegReference {
  exists: boolean;
  activationReady: boolean;
  prelaunch: boolean;
  mappingBlocked: boolean;
  originLocationId: number;
  destinationLocationId: number;
  readinessVersion: number;
  pricingMode: "fixed" | "contact" | "disabled";
  normalPriceVnd: number | null;
}
export type EmptyLegResolver = (scope: EmptyLegScope) => EmptyLegReference;
export type EmptyLegValidation = { valid: true; model: EmptyLegModel } | { valid: false; errors: string[] };
