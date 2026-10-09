/** Day 46: passenger counts exclude the driver. No inference from seat/category labels. */
export type LuggageDimensions = [number, number, number];
export type VehicleLoadProfile = {
  passengers: number;
  cabin_bags: number;
  checked_bags: number;
  cabin_max_cm: LuggageDimensions | null;
  checked_max_cm: LuggageDimensions | null;
  total_luggage_kg: number | null;
};
export type VehicleServiceLevel = "standard" | "business" | "premium";
export type ConfirmedVehicleFacts = {
  model_version: 1;
  revision: number;
  vehicle_id: number;
  status: "confirmed";
  reviewed_at: string;
  passenger_capacity: number | null;
  load_profiles: VehicleLoadProfile[];
  model_examples: string[] | null;
  service_level: VehicleServiceLevel | null;
};
export type VehicleFacts =
  | { status: "needs_consultation"; facts: null }
  | { status: "confirmed"; facts: ConfirmedVehicleFacts };
export type VehicleFitRequest = {
  passengers: number;
  /** null/absent means unknown, never zero bags. */
  luggage?: Omit<VehicleLoadProfile, "passengers"> | null;
  service_level?: VehicleServiceLevel | null;
};
export type VehicleFitResult = {
  status: "fits_confirmed_profile" | "needs_consultation" | "exceeds_confirmed_capacity";
  reason: "confirmed_profile" | "missing_facts" | "invalid_request" | "missing_luggage" | "passenger_limit" | "unconfirmed_load" | "service_level";
  revision?: number;
};
