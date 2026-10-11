import type { VehicleSelectorResponse } from "@/types/vehicle-selector";

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
/** A malformed or unsupported response must keep the consultation path available. */
export function readVehicleSelectorResponse(value: unknown): VehicleSelectorResponse | null {
  if (!object(value) || value.model_version !== 1 || !Array.isArray(value.items)) return null;
  for (const item of value.items) {
    if (!object(item) || typeof item.id !== "string" || typeof item.type !== "string" || !object(item.facts) || !object(item.fit)) return null;
    if (![item.facts.passengers, item.facts.models, item.facts.serviceLevel].every((field) => typeof field === "string") || !Array.isArray(item.facts.loadProfiles) || !item.facts.loadProfiles.every((field) => typeof field === "string")) return null;
    if (!["fits_confirmed_profile", "needs_consultation", "exceeds_confirmed_capacity"].includes(item.fit.status as string) || !["confirmed_profile", "missing_facts", "invalid_request", "missing_luggage", "passenger_limit", "unconfirmed_load", "service_level"].includes(item.fit.reason as string)) return null;
  }
  return value as VehicleSelectorResponse;
}
