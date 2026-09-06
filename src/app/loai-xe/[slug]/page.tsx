import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleTypeLanding } from "@/components/vehicle-type-landing";
import { getVehicleCategory, vehicleCategories } from "@/data/vehicle-categories";
import { fetchVehicles } from "@/lib/api/vehicles";
import { getPricingTable, pricingForVehicleType } from "@/lib/api/pricing";
import { fetchServices } from "@/lib/api/services";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return vehicleCategories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getVehicleCategory(slug);
  return category
    ? { title: `${category.label} | Xe Miền Nam`, description: category.description }
    : { title: "Không tìm thấy loại xe | Xe Miền Nam" };
}

/**
 * Server Component (Ngày 13) — `category` là nội dung tĩnh (data/vehicle-categories.ts),
 * nhưng vehicles/routePrices/relatedRoutes/services đều lọc từ dữ liệu THẬT
 * (fetchVehicles()/getPricingTable()/fetchServices(), đều đã có fallback mock từ Ngày 12/13),
 * nên khi Ngày 24 nhập dữ liệu WordPress thật, trang này tự động cập nhật không cần sửa code.
 */
export default async function VehicleTypeDetailPage({ params }: Props) {
  const { slug } = await params;
  const category = getVehicleCategory(slug);
  if (!category) notFound();

  const [allVehicles, pricingTable, allServices] = await Promise.all([
    fetchVehicles(),
    getPricingTable(),
    fetchServices(),
  ]);

  const vehicles = allVehicles.filter((v) => v.type === category.type);

  const rows = pricingForVehicleType(pricingTable, category.type);
  const routePrices = rows.map((row) => ({
    route: row.routeLabel,
    price: row.priceLabel,
    note: "Giá tham khảo, thay đổi theo mùa/lễ",
  }));
  // Gộp theo routeSlug để mỗi tuyến chỉ xuất hiện 1 lần trong danh sách "tuyến có thể đi"
  // (bảng giá pricingTable có 1 dòng/mỗi xe, nên 1 tuyến có thể lặp lại nếu có nhiều xe cùng loại).
  const relatedRoutes = Array.from(new Map(rows.map((row) => [row.routeSlug, row])).values()).map((row) => ({
    label: row.routeLabel,
    href: `/tuyen-duong/${row.routeSlug}`,
  }));

  const services = allServices
    .filter((service) => service.vehicleTypes.some((vt) => vt.slug === category.slug))
    .map((service) => ({ title: service.name, description: service.shortDescription, href: `/dich-vu/${service.slug}` }));

  return (
    <VehicleTypeLanding
      category={category}
      vehicles={vehicles}
      routePrices={routePrices}
      relatedRoutes={relatedRoutes}
      services={services}
    />
  );
}
