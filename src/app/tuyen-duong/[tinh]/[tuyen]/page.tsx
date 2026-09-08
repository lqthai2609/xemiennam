import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteDetailPage } from "@/components/route-detail";
import { fetchRoutes, fetchRouteBySlug, fetchRelatedRoutes } from "@/lib/api/routes";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema } from "@/lib/schema";
import { routeHref } from "@/types/route";

type Props = { params: Promise<{ tinh: string; tuyen: string }> };

/**
 * Ngày 25 — `slug` bài `route` là duy nhất trên toàn site (không chỉ trong 1 tỉnh), nên
 * generateStaticParams() vẫn dùng `route.slug` làm `tuyen` như cũ, chỉ thêm `tinh` từ
 * `route.regionSlug` để khớp cấu trúc URL lồng mới `/tuyen-duong/[tinh]/[tuyen]`.
 */
export async function generateStaticParams() {
  const routes = await fetchRoutes();
  return routes.map(({ slug, regionSlug }) => ({ tinh: regionSlug || "khac", tuyen: slug }));
}

/**
 * Ngày 23 — ưu tiên rankMathTitle/rankMathDescription (nhập tay trong Rank Math ở Ngày 24)
 * trước khi dùng title/description tự soạn từ dữ liệu route, đúng mục 5 kiến trúc kỹ thuật.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tuyen } = await params;
  const route = await fetchRouteBySlug(tuyen);
  if (!route) return { title: "Không tìm thấy tuyến | Xe Miền Nam" };
  return {
    title: route.rankMathTitle || `Thuê xe ${route.from} đi ${route.to} — giá từ ${route.price} | Xe Miền Nam`,
    description: route.rankMathDescription || route.summary,
  };
}

export default async function Page({ params }: Props) {
  const { tinh, tuyen } = await params;
  const route = await fetchRouteBySlug(tuyen);
  // 404 nếu không tìm thấy tuyến, HOẶC tuyến có thật nhưng KHÔNG thuộc đúng tỉnh trên URL
  // (vd ai đó gõ tay /tuyen-duong/da-lat/tp-hcm-vung-tau) — tránh 2 URL cùng phục vụ 1 nội
  // dung (canonical theo đúng hub), giống nguyên tắc slug nhất quán mục 9.3 kiến trúc kỹ thuật.
  if (!route || route.regionSlug !== tinh) notFound();
  const relatedRoutes = await fetchRelatedRoutes(route.slug, 3);
  const serviceSchema = buildServiceSchema({
    name: `Thuê xe nguyên chiếc ${route.from} đi ${route.to}`,
    description: route.summary || `Thuê xe nguyên chiếc tuyến ${route.from} – ${route.to}, giá từ ${route.price}.`,
    url: routeHref(route),
    areaServed: [route.from, route.to],
  });
  return (
    <>
      <JsonLd data={serviceSchema} />
      <RouteDetailPage route={route} relatedRoutes={relatedRoutes} />
    </>
  );
}
