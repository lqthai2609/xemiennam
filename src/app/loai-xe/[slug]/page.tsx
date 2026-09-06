import { notFound } from "next/navigation";
import { VehicleTypeLanding } from "@/components/vehicle-type-landing";
import { getCategoryVehicles, getVehicleCategory, vehicleCategories } from "@/data/vehicle-categories";
import { fetchVehicles } from "@/lib/api/vehicles";

export function generateStaticParams() { return vehicleCategories.map(({ slug }) => ({ slug })); }

export default async function VehicleTypeDetailPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const category = getVehicleCategory(slug); if (!category) notFound(); const vehicles = getCategoryVehicles(category, await fetchVehicles()); return <VehicleTypeLanding category={category} vehicles={vehicles} detail />; }
