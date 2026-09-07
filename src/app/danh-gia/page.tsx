import type { Metadata } from "next";
import { fetchTestimonials } from "@/lib/api/testimonials";
import { fetchRoutes } from "@/lib/api/routes";
import { DanhGiaPageClient } from "@/components/danh-gia-page-client";
import { JsonLd } from "@/components/json-ld";
import { buildAggregateRatingSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Đánh giá khách hàng | Xe Miền Nam",
  description: "Đánh giá thật từ khách hàng đã thuê xe cùng Xe Miền Nam, lọc theo số sao và theo tuyến.",
};

/**
 * Server Component — gọi fetchTestimonials() (WP REST API thật + fallback mock, Ngày 18)
 * và fetchRoutes() (Ngày 12) song song, giao dữ liệu cho DanhGiaPageClient xử lý lọc
 * client-side. fetchRoutes() chỉ dùng để hiển thị tên tuyến đầy đủ thay vì slug thô.
 *
 * Ngày 23 — điểm trung bình cho AggregateRating tính lại ở server (cùng công thức
 * DanhGiaPageClient đang dùng client-side) để không lệch số hiển thị với JSON-LD.
 */
export default async function Page() {
  const [testimonials, routes] = await Promise.all([fetchTestimonials(), fetchRoutes()]);

  let aggregateSchema = null;
  if (testimonials.length > 0) {
    const averageRating = testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length;
    aggregateSchema = buildAggregateRatingSchema({
      ratingValue: averageRating,
      reviewCount: testimonials.length,
      reviews: testimonials.map((t) => ({
        author: t.name,
        ratingValue: t.rating,
        reviewBody: t.quote,
        datePublished: t.date,
      })),
    });
  }

  return (
    <>
      {aggregateSchema && <JsonLd data={aggregateSchema} />}
      <DanhGiaPageClient testimonials={testimonials} routes={routes} />
    </>
  );
}
