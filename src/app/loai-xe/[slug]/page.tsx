import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleTypeLanding } from "@/components/vehicle-type-landing";
import { getVehicleCategory, vehicleCategories, withRealCategoryImage, withRealCategoryImages } from "@/data/vehicle-categories";
import { fetchVehicles } from "@/lib/api/vehicles";
import { getPricingTable, pricingForVehicleType } from "@/lib/api/pricing";
import { fetchServices } from "@/lib/api/services";
import { fetchPostsByVehicleType } from "@/lib/api/blog";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema } from "@/lib/schema";

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

  const [allVehicles, pricingTable, allServices, relatedPosts] = await Promise.all([
    fetchVehicles(),
    getPricingTable(),
    fetchServices(),
    fetchPostsByVehicleType(category.slug, 3),
  ]);

  const vehicles = allVehicles.filter((v) => v.type === category.type);
  // Ảnh hero dùng ảnh xe THẬT nếu có (cùng cơ chế với thẻ ở trang danh sách /loai-xe) —
  // xem withRealCategoryImage() trong data/vehicle-categories.ts.
  const displayCategory = withRealCategoryImage(category, vehicles);
  // Gallery ảnh thật của loại xe (Ngày 25c) — gộp ảnh từ TẤT CẢ xe cùng loại (không chỉ ảnh
  // đầu như hero), loại trùng bằng Set vì nhiều xe có thể dùng chung 1 ảnh, giới hạn 7 ảnh
  // (khớp lưới bento 1 ảnh lớn + tối đa 6 ảnh nhỏ của VehicleRealGallery).
  const galleryImages = Array.from(new Set(vehicles.flatMap((vehicle) => vehicle.images))).slice(0, 7);

  const rows = pricingForVehicleType(pricingTable, category.type);
  const routePrices = rows.map((row) => ({
    route: row.routeLabel,
    price: row.priceLabel,
    note: "Giá tham khảo, thay đổi theo mùa/lễ",
  }));
  // Gộp theo routeSlug để mỗi tuyến chỉ xuất hiện 1 lần trong danh sách "tuyến có thể đi"
  // (bảng giá pricingTable có 1 dòng/mỗi xe, nên 1 tuyến có thể lặp lại nếu có nhiều xe cùng loại).
  // Ngày 14: trỏ thẳng sang trang kết hợp tuyến+loại xe (SEO hẹp hơn, đúng ngữ cảnh
  // "đi tuyến này bằng loại xe này") thay vì trang tuyến đầy đủ chung chung.
  const relatedRoutes = Array.from(new Map(rows.map((row) => [row.routeSlug, row])).values()).map((row) => ({
    label: row.routeLabel,
    href: `/tuyen-duong/${row.routeSlug}/${category.slug}`,
  }));

  const services = allServices
    .filter((service) => service.vehicleTypes.some((vt) => vt.slug === category.slug))
    .map((service) => ({ title: service.name, description: service.shortDescription, href: `/dich-vu/${service.slug}` }));

  // Section "Xem thêm các loại xe khác" ở cuối trang, trước CTA — gợi ý các loại xe còn lại
  // (ảnh dùng ảnh xe thật nếu có, cùng cơ chế withRealCategoryImage() ở trên), giới hạn 3 thẻ
  // để không lấn CTA, kèm link "Xem tất cả loại xe" sang /loai-xe cho các loại còn lại.
  const otherCategories = withRealCategoryImages(
    vehicleCategories.filter((c) => c.slug !== category.slug),
    allVehicles,
  ).slice(0, 3);

  const serviceSchema = buildServiceSchema({
    name: `Thuê xe ${category.label.toLowerCase()} nguyên chiếc`,
    description: category.description,
    url: `/loai-xe/${category.slug}`,
  });

  return (
    <>
      <JsonLd data={serviceSchema} />
      <VehicleTypeLanding
        category={displayCategory}
        routePrices={routePrices}
        relatedRoutes={relatedRoutes}
        services={services}
        galleryImages={galleryImages}
        relatedPosts={relatedPosts}
        otherCategories={otherCategories}
      />
    </>
  );
}
