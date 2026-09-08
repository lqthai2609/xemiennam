import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComboLandingPage } from "@/components/route-vehicle-combo";
import { fetchRoutes, fetchRouteBySlug } from "@/lib/api/routes";
import { getVehicleCategory } from "@/data/vehicle-categories";
import { findComboVehiclePrice, comboDescriptionOrDefault } from "@/lib/combo";
import { routeComboHref, vehicleTypeSlug } from "@/types/route";
import { getTestimonialsForCombo } from "@/data/testimonials";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema } from "@/lib/schema";

type Props = { params: Promise<{ tinh: string; tuyen: string; "loai-xe": string }> };

/**
 * Sinh tĩnh mỗi tổ hợp tuyến + loại xe có thật trong pricingByVehicle của route đó (Ngày 14).
 * Không sinh toàn bộ 4 loại xe cho mọi tuyến — chỉ đúng những tổ hợp route thực sự áp dụng
 * (vd tuyến Đà Lạt chỉ có 4–7 chỗ + Limousine, không có 45 chỗ). Ngày 25: thêm `tinh` từ
 * `route.regionSlug` để khớp cấu trúc URL lồng mới.
 */
export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.flatMap((route) =>
    route.pricingByVehicle.map((vp) => ({
      tinh: route.regionSlug || "khac",
      tuyen: route.slug,
      "loai-xe": vehicleTypeSlug(vp.vehicleType),
    })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tuyen, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(tuyen);
  const vp = route ? findComboVehiclePrice(route, loaiXe) : undefined;
  if (!route || !vp) return { title: "Không tìm thấy | Xe Miền Nam" };

  return {
    title: `Thuê xe ${vp.vehicleType} đi ${route.from} – ${route.to}, giá từ ${vp.price} | Xe Miền Nam`,
    description: comboDescriptionOrDefault(route, vp),
  };
}

export default async function Page({ params }: Props) {
  const { tinh, tuyen, "loai-xe": loaiXe } = await params;
  const route = await fetchRouteBySlug(tuyen);
  // Cùng nguyên tắc canonical như trang chi tiết tuyến — 404 nếu route không thuộc đúng tỉnh trên URL.
  if (!route || route.regionSlug !== tinh) notFound();
  const vp = findComboVehiclePrice(route, loaiXe);
  const category = getVehicleCategory(loaiXe);
  if (!vp || !category) notFound();

  const testimonials = getTestimonialsForCombo(route.slug, vp.vehicleType);
  const description = comboDescriptionOrDefault(route, vp);
  const serviceSchema = buildServiceSchema({
    name: `Thuê xe ${vp.vehicleType.toLowerCase()} đi ${route.from} – ${route.to}`,
    description,
    url: routeComboHref(route, loaiXe),
    areaServed: [route.from, route.to],
  });

  return (
    <>
      <JsonLd data={serviceSchema} />
      <ComboLandingPage route={route} vehiclePrice={vp} category={category} testimonials={testimonials} />
    </>
  );
}
