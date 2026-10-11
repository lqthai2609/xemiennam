import { readVehicleFacts, vehiclePassengerLabel, VEHICLE_CONSULTATION_LABEL } from "./vehicle-facts";
import type { Vehicle } from "@/types/vehicle";
import type { VehicleFactsDisplay } from "@/types/vehicle-selector";

const serviceLabels = { standard: "Tiêu chuẩn", business: "Thương gia", premium: "Cao cấp" };
/** Per-vehicle display only. Never promote one vehicle's facts to a category. */
export function vehicleFactsDisplay(vehicle: Pick<Vehicle, "id" | "operationalFacts">): VehicleFactsDisplay {
  const read = readVehicleFacts(vehicle.operationalFacts?.facts, Number(vehicle.id));
  const facts = vehicle.operationalFacts?.status === "confirmed" && read.status === "confirmed" ? read.facts : null;
  return {
    passengers: facts ? vehiclePassengerLabel(read) : VEHICLE_CONSULTATION_LABEL,
    models: facts?.model_examples?.join(" · ") || VEHICLE_CONSULTATION_LABEL,
    serviceLevel: facts?.service_level ? serviceLabels[facts.service_level] : VEHICLE_CONSULTATION_LABEL,
    loadProfiles: facts?.load_profiles.map((profile) => {
      const bags = [
        profile.cabin_bags ? `${profile.cabin_bags} kiện nhóm xách tay, mỗi kiện tối đa ${profile.cabin_max_cm!.join(" × ")} cm` : "0 kiện nhóm xách tay",
        profile.checked_bags ? `${profile.checked_bags} kiện nhóm ký gửi, mỗi kiện tối đa ${profile.checked_max_cm!.join(" × ")} cm` : "0 kiện nhóm ký gửi",
      ];
      return `Tối đa ${profile.passengers} hành khách cùng ${bags.join("; ")}${profile.total_luggage_kg === null ? "; không hành lý" : `; tổng hành lý tối đa ${profile.total_luggage_kg} kg`}.`;
    }) || [],
  };
}
