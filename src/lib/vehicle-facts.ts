import type { ConfirmedVehicleFacts, VehicleFacts, VehicleFitRequest, VehicleFitResult, VehicleLoadProfile } from "@/types/vehicle-facts";

export const VEHICLE_FACTS_VERSION = 1;
export const VEHICLE_CONSULTATION_LABEL = "Cần tư vấn";
const unknownFacts: VehicleFacts = { status: "needs_consultation", facts: null };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, required: string[]) => Object.keys(v).length === required.length && required.every((k) => Object.hasOwn(v, k));
const integer = (v: unknown, min: number, max = 100) => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const dimensions = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every((n) => integer(n, 1, 300));
const level = (v: unknown) => v === null || ["standard", "business", "premium"].includes(v as string);
const loadKeys = ["passengers", "cabin_bags", "checked_bags", "cabin_max_cm", "checked_max_cm", "total_luggage_kg"];

function validLoad(v: unknown): v is VehicleLoadProfile {
  if (!object(v) || !keys(v, loadKeys) || !integer(v.passengers, 1) || !integer(v.cabin_bags, 0) || !integer(v.checked_bags, 0)) return false;
  if (v.cabin_bags === 0 ? v.cabin_max_cm !== null : !dimensions(v.cabin_max_cm)) return false;
  if (v.checked_bags === 0 ? v.checked_max_cm !== null : !dimensions(v.checked_max_cm)) return false;
  return v.cabin_bags === 0 && v.checked_bags === 0 ? v.total_luggage_kg === null : integer(v.total_luggage_kg, 1, 5000);
}

/** Only the protected WordPress REST projection is accepted. Legacy/mock fields are ignored. */
export function readVehicleFacts(input: unknown, vehicleId: unknown, now = Date.now()): VehicleFacts {
  if (!object(input) || !keys(input, ["model_version", "revision", "vehicle_id", "status", "reviewed_at", "passenger_capacity", "load_profiles", "model_examples", "service_level"])) return unknownFacts;
  if (input.model_version !== VEHICLE_FACTS_VERSION || input.status !== "confirmed" || !integer(input.revision, 1, Number.MAX_SAFE_INTEGER) || !integer(input.vehicle_id, 1, Number.MAX_SAFE_INTEGER) || input.vehicle_id !== vehicleId || !Number.isFinite(now)) return unknownFacts;
  if (typeof input.reviewed_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(input.reviewed_at)) return unknownFacts;
  const reviewedAt = Date.parse(input.reviewed_at);
  if (!Number.isFinite(reviewedAt) || new Date(reviewedAt).toISOString().replace(".000Z", "Z") !== input.reviewed_at || reviewedAt > now) return unknownFacts;
  if (input.passenger_capacity !== null && !integer(input.passenger_capacity, 1)) return unknownFacts;
  if (!Array.isArray(input.load_profiles) || input.load_profiles.length > 30 || !input.load_profiles.every(validLoad)) return unknownFacts;
  if (input.load_profiles.length && (input.passenger_capacity === null || input.load_profiles.some((p) => p.passengers > (input.passenger_capacity as number)))) return unknownFacts;
  if (new Set(input.load_profiles.map((p) => JSON.stringify(loadKeys.map((k) => p[k as keyof VehicleLoadProfile])))).size !== input.load_profiles.length) return unknownFacts;
  if (input.model_examples !== null && (!Array.isArray(input.model_examples) || input.model_examples.length < 1 || input.model_examples.length > 10 || !input.model_examples.every((m) => typeof m === "string" && m.trim() === m && m.length > 0 && [...m].length <= 120 && !/[<>\x00-\x1f]/.test(m)) || new Set(input.model_examples).size !== input.model_examples.length)) return unknownFacts;
  if (!level(input.service_level)) return unknownFacts;
  return { status: "confirmed", facts: structuredClone(input) as ConfirmedVehicleFacts };
}

/** Joint loading envelopes: never combine maxima belonging to different profiles. */
export function assessVehicleFit(input: VehicleFacts | undefined, request: VehicleFitRequest): VehicleFitResult {
  if (!object(request) || Object.keys(request).some((k) => !["passengers", "luggage", "service_level"].includes(k)) || !integer(request.passengers, 1) || (request.service_level !== undefined && !level(request.service_level))) return { status: "needs_consultation", reason: "invalid_request" };
  // Revalidate at use, including future versions, mismatched status and malformed profiles.
  const read = readVehicleFacts(input?.facts, input?.facts?.vehicle_id);
  if (input?.status !== "confirmed" || read.status !== "confirmed") return { status: "needs_consultation", reason: "missing_facts" };
  const facts = read.facts;
  const result = (status: VehicleFitResult["status"], reason: VehicleFitResult["reason"]): VehicleFitResult => ({ status, reason, revision: facts.revision });
  if (facts.passenger_capacity === null) return result("needs_consultation", "missing_facts");
  if (request.passengers > facts.passenger_capacity) return result("exceeds_confirmed_capacity", "passenger_limit");
  if (request.service_level && request.service_level !== facts.service_level) return result("needs_consultation", "service_level");
  if (request.luggage === undefined || request.luggage === null) return result("needs_consultation", "missing_luggage");
  if (!object(request.luggage) || !validLoad({ ...request.luggage, passengers: request.passengers }) || Object.hasOwn(request.luggage, "passengers")) return result("needs_consultation", "invalid_request");
  const luggage = request.luggage;
  // Orientation is intentionally fixed. Oversize/irregular bags require Operations advice.
  const bounded = (needed: number[] | null, limit: number[] | null) => needed === null || (limit !== null && needed.every((n, i) => n <= limit[i]));
  const fits = facts.load_profiles.some((p) => request.passengers <= p.passengers && luggage.cabin_bags <= p.cabin_bags && luggage.checked_bags <= p.checked_bags && bounded(luggage.cabin_max_cm, p.cabin_max_cm) && bounded(luggage.checked_max_cm, p.checked_max_cm) && (luggage.total_luggage_kg === null || (p.total_luggage_kg !== null && luggage.total_luggage_kg <= p.total_luggage_kg)));
  return fits ? result("fits_confirmed_profile", "confirmed_profile") : result("needs_consultation", "unconfirmed_load");
}

/** Model examples describe possibilities, never guaranteed assignment or availability. */
export function vehiclePassengerLabel(input: VehicleFacts | undefined): string {
  const read = readVehicleFacts(input?.facts, input?.facts?.vehicle_id);
  return input?.status === "confirmed" && read.status === "confirmed" && read.facts.passenger_capacity !== null ? `Tối đa ${read.facts.passenger_capacity} hành khách (không gồm tài xế)` : VEHICLE_CONSULTATION_LABEL;
}
