import { VehicleCategoryIndex } from "@/components/vehicle-type-landing";
import { vehicleCategories } from "@/data/vehicle-categories";

export const metadata = { title: "Loại xe | Xe Miền Nam", description: "Chọn loại xe phù hợp cho gia đình, đoàn nhỏ, limousine và đoàn lớn." };

export default function VehicleTypesPage() { return <VehicleCategoryIndex categories={vehicleCategories} />; }
