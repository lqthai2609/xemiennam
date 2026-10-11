import "server-only";
import { fetchVehicles } from "./vehicles";
import { assessVehicleFit, readVehicleFacts } from "@/lib/vehicle-facts";
import type { Vehicle } from "@/types/vehicle";
import type { VehicleFitRequest, VehicleFitResult } from "@/types/vehicle-facts";

export type VehicleSuggestion = { vehicle: Vehicle; fit: VehicleFitResult };
/** The server owns factual fit; UI will consume this in Day 47. No availability/price promise. */
export function evaluateVehicleSuggestions(vehicles: Vehicle[], request: VehicleFitRequest) {
  const recommended: VehicleSuggestion[] = [], consultation: VehicleSuggestion[] = [], excluded: VehicleSuggestion[] = [];
  for (const vehicle of vehicles) {
    const id = Number(vehicle.id);
    const verified = readVehicleFacts(vehicle.operationalFacts?.facts, id);
    const fit = assessVehicleFit(vehicle.operationalFacts?.status === "confirmed" ? verified : undefined, request);
    const candidate = { vehicle, fit };
    if (fit.status === "fits_confirmed_profile") recommended.push(candidate);
    else if (fit.status === "exceeds_confirmed_capacity") excluded.push(candidate);
    else consultation.push(candidate);
  }
  return { recommended, consultation, excluded };
}

export async function fetchVehicleSuggestions(request: VehicleFitRequest) {
  // Avoid reusing cached approvals after Operations changes/withdraws a record.
  return evaluateVehicleSuggestions(await fetchVehicles({ freshFacts: true }), request);
}
