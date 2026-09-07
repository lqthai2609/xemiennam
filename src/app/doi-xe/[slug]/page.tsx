import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchVehicles, fetchVehicleBySlug, fetchSimilarVehicles } from "@/lib/api/vehicles";
import { VehicleDetail } from "@/components/vehicle-detail";

export type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const vehicles = await fetchVehicles();
  return vehicles.map(({ slug }) => ({ slug }));
}

/** Ngày 23 — ưu tiên rankMathTitle/rankMathDescription trước khi tự soạn (mục 5, kiến trúc kỹ thuật). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await fetchVehicleBySlug(slug);
  return vehicle
    ? {
        title: vehicle.rankMathTitle || `${vehicle.name} — thuê xe nguyên chiếc | Xe Miền Nam`,
        description: vehicle.rankMathDescription || vehicle.description,
      }
    : { title: "Không tìm thấy xe | Xe Miền Nam" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const vehicle = await fetchVehicleBySlug(slug);
  if (!vehicle) notFound();
  const related = await fetchSimilarVehicles(slug);
  return <VehicleDetail vehicle={vehicle} related={related} />;
}
