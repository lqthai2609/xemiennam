import type { LucideIcon } from "lucide-react";

export type ServiceIcon = "wedding" | "airport" | "monthly" | "city-tour";

export type ServiceVehicleType = {
  name: string;
  slug: string;
  description: string;
};

export type ServiceVehicle = {
  name: string;
  slug: string;
  detail: string;
};

export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  detailDescription: string;
  icon: ServiceIcon;
  iconLabel: string;
  vehicleTypes: ServiceVehicleType[];
  suggestedVehicles: ServiceVehicle[];
  notes: string[];
  hotline: string;
};

export type ServiceIconMap = Record<ServiceIcon, LucideIcon>;
