import type { VehicleFitResult } from "./vehicle-facts";

export type VehicleFactsDisplay = {
  passengers: string;
  models: string;
  serviceLevel: string;
  loadProfiles: string[];
};
export type VehicleSelectorItem = {
  id: string;
  type: string;
  facts: VehicleFactsDisplay;
  fit: VehicleFitResult;
};
export type VehicleSelectorResponse = {
  model_version: 1;
  items: VehicleSelectorItem[];
};
