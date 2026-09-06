import type { Metadata } from "next";
import { fetchTestimonials } from "@/lib/api/testimonials";
import { fetchRoutes } from "@/lib/api/routes";
import { DanhGiaPageClient } from "@/components/danh-gia-page-client";

export const metadata: Metadata = {
  title: "Đánh giá khách hàng | Xe Miền Nam",
  description: "Đánh giá thật từ khách hàng đã thuê xe cùng Xe Miền Nam, lọc theo số sao và theo tuyến.",
};

/**
 * Server Component — gọi fetchTestimonials() (WP REST API thật + fallback mock, Ngày 18)
 * và fetchRoutes() (Ngày 12) song song, giao dữ liệu cho DanhGiaPageClient xử lý lọc
 * client-side. fetchRoutes() chỉ dùng để hiển thị tên tuyến đầy đủ thay vì slug thô.
 */
export default async function Page() {
  const [testimonials, routes] = await Promise.all([fetchTestimonials(), fetchRoutes()]);
  return <DanhGiaPageClient testimonials={testimonials} routes={routes} />;
}
