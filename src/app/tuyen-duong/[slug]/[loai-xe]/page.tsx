import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComboLandingPage } from "@/components/route-vehicle-combo";
import { fetchRoutes, fetchRouteBySlug } from "@/lib/api/routes";
import { getVehicleCategory } from "@/data/vehicle-categories";
import { findComboVehiclePrice, comboDescriptionOrDefault } from "@/lib/combo";
import { vehicleTypeSlug } from "@/types/route";
import { getTestimonialsForCombo } from "@/data/testimonials";

type Props = { params: Promise<{ slug: string; "loai-xe": string }> };

/**
 * Sinh tĩnh mỗi tổ hợp tuyến + loại xe có thật trong pricingByVehicle của route đó (Ngày 14).
 * Không sinh toàn bộ 4 loại xe cho mọi tuyến — chỉ đúng những tổ hợp route thực sự áp dụng
 * (vd tuyến Đà Lạt chỉ có 4–7 chỗ + Limousine, không có 45 chỗ).
 */
export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.flatMap((route) =>
    route.pricingByVehicle.map((vp) => ({ slug: route.slug, "loai-xe": vehicleTypeSlug(vp.vehicleType) })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(slug);
  const vp = route ? findComboVehiclePrice(route, loaiXe) : undefined;
  if (!route || !vp) return { title: "Không tìm thấy | Xe Miền Nam" };

  return {
    title: `Thuê xe ${vp.vehicleType} đi ${route.from} – ${route.to}, giá từ ${vp.price} | Xe Miền Nam`,
    description: comboDescriptionOrDefault(route, vp),
  };
}

export default async function Page({ params }: Props) {
  const { slug, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(slug);
  const vp = route ? findComboVehiclePrice(route, loaiXe) : undefined;
  const category = getVehicleCategory(loaiXe);
  if (!route || !vp || !category) notFound();

  const testimonials = getTestimonialsForCombo(route.slug, vp.vehicleType);

  return <ComboLandingPage route={route} vehiclePrice={vp} category={category} testimonials={testimonials} />;
}
