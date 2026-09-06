import type { Metadata } from "next";
import { VehicleCategoryIndex } from "@/components/vehicle-type-landing";
import { vehicleCategories } from "@/data/vehicle-categories";

export const metadata: Metadata = {
  title: "Loại xe | Xe Miền Nam",
  description: "Chọn loại xe phù hợp cho gia đình, đoàn nhỏ, limousine và đoàn lớn.",
};

// 4 loại xe là nội dung tĩnh (không fetch) — xem ghi chú trong types/vehicle-category.ts.
export default function VehicleTypesPage() {
  return <VehicleCategoryIndex categories={vehicleCategories} />;
}
