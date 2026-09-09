import type { Metadata } from "next";
import { VehicleCategoryIndex } from "@/components/vehicle-type-landing";
import { vehicleCategories, withRealCategoryImages } from "@/data/vehicle-categories";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchRoutes } from "@/lib/api/routes";

export const metadata: Metadata = {
  title: "Loại xe | Xe Miền Nam",
  description: "Chọn loại xe phù hợp cho gia đình, đoàn nhỏ, limousine và đoàn lớn.",
};

// 6 loại xe là nội dung tĩnh (không fetch) — xem ghi chú trong types/vehicle-category.ts.
// Vẫn gọi fetchVehicles() ở đây để lấy ảnh xe THẬT (nếu CMS đã có) thay cho ảnh placeholder
// của từng thẻ loại xe — xem withRealCategoryImages() trong data/vehicle-categories.ts.
export default async function VehicleTypesPage() {
  const [vehicles, routes] = await Promise.all([fetchVehicles(), fetchRoutes()]);
  const categories = withRealCategoryImages(vehicleCategories, vehicles);
  return <VehicleCategoryIndex categories={categories} routes={routes} />;
}
