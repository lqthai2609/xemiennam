import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { vehicles, getSimilarVehicles, getVehicleBySlug } from "@/data/vehicles";
import { VehicleDetail } from "@/components/vehicle-detail";
export type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return vehicles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const vehicle = getVehicleBySlug(slug); return vehicle ? { title: `${vehicle.name} — thuê xe nguyên chiếc | Xe Miền Nam`, description: vehicle.description } : { title: "Không tìm thấy xe | Xe Miền Nam" }; }
export default async function Page({ params }: Props) { const { slug } = await params; const vehicle = getVehicleBySlug(slug); if (!vehicle) notFound(); return <VehicleDetail vehicle={vehicle} related={getSimilarVehicles(slug)} />; }
