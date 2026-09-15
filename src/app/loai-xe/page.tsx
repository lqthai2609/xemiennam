import type { Metadata } from "next";
import { VehicleCategoryIndex } from "@/components/vehicle-type-landing-day13";
import { vehicleCategories, withRealCategoryImages } from "@/data/vehicle-categories";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchRoutes } from "@/lib/api/routes";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site-config";
import { getVehicleCategoryStartingPrice } from "@/lib/vehicle-category-pricing";

export const metadata: Metadata = buildPageMetadata({
  title: `Loại xe | ${SITE_NAME}`,
  description: "Chọn loại xe phù hợp cho gia đình, đoàn nhỏ, limousine và đoàn lớn.",
  path: "/loai-xe",
});

// 6 loại xe là nội dung cấu trúc tĩnh; ảnh và giá đại diện được nối từ dữ liệu production.
export default async function VehicleTypesPage() {
  const [vehicles, routes] = await Promise.all([fetchVehicles(), fetchRoutes()]);
  const categories = withRealCategoryImages(vehicleCategories, vehicles).map((category) => ({
    ...category,
    // Day 13: Pricing V2 là source of truth. Khi chưa có giá renderable, không hiển thị
    // marketing price hard-code như thể đó là dữ liệu production.
    startingPrice: getVehicleCategoryStartingPrice(routes, category.type) ?? "Liên hệ báo giá",
  }));

  return <VehicleCategoryIndex categories={categories} routes={routes} />;
}
