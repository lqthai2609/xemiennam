import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchRegionSlugs, fetchRoutesByRegion } from "@/lib/api/routes";
import { fetchDiemDenBySlug, getDestinationImageUrl } from "@/lib/api/diem-den";
import { DiemDenDetailPage } from "@/components/diem-den-detail";
import { JsonLd } from "@/components/json-ld";
import { buildServiceSchema, buildFaqPageSchema } from "@/lib/schema";
import { stripHtml } from "@/lib/wp";

type Props = { params: Promise<{ tinh: string }> };

/**
 * Sinh tĩnh mỗi tỉnh có ÍT NHẤT 1 tuyến (Ngày 25) — không sinh theo danh sách toàn bộ term
 * `province` bên WordPress, vì 1 term rỗng (chưa có tuyến nào, xem đợt dọn taxonomy Ngày 25)
 * sẽ tạo ra trang hub trống rỗng, không có nội dung để hiển thị.
 */
export async function generateStaticParams() {
  const slugs = await fetchRegionSlugs();
  return slugs.map((tinh) => ({ tinh }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tinh } = await params;
  const [hub, routes] = await Promise.all([fetchDiemDenBySlug(tinh), fetchRoutesByRegion(tinh)]);
  if (routes.length === 0 && !hub) return { title: "Không tìm thấy điểm đến | Xe Miền Nam" };

  const regionName = routes[0]?.region || hub?.title || tinh;
  return {
    title: hub?.rankMathTitle || `Thuê xe nguyên chiếc đi ${regionName} | Xe Miền Nam`,
    description:
      hub?.rankMathDescription ||
      (hub ? stripHtml(hub.contentHtml).slice(0, 155) : `Thuê xe nguyên chiếc đi khắp khu vực ${regionName}, ${routes.length} tuyến đang chạy, giá theo từng loại xe.`),
  };
}

export default async function Page({ params }: Props) {
  const { tinh } = await params;
  const [hub, routes] = await Promise.all([fetchDiemDenBySlug(tinh), fetchRoutesByRegion(tinh)]);
  // 404 chỉ khi CẢ hub content lẫn danh sách tuyến đều rỗng — 1 tỉnh có tuyến nhưng chưa có
  // bài diem_den (đa số trường hợp hiện tại, xem hub?.title fallback ở DiemDenDetailPage) vẫn
  // là trang hợp lệ, không phải 404.
  if (routes.length === 0 && !hub) notFound();

  const regionName = routes[0]?.region || hub?.title || tinh;
  const description = hub
    ? stripHtml(hub.contentHtml).slice(0, 200)
    : `Thuê xe nguyên chiếc đi khắp khu vực ${regionName}, ${routes.length} tuyến đang chạy.`;

  const serviceSchema = buildServiceSchema({
    name: `Thuê xe nguyên chiếc đi ${regionName}`,
    description,
    url: `/tuyen-duong/${tinh}`,
    areaServed: regionName,
  });

  return (
    <>
      <JsonLd data={serviceSchema} />
      {hub && hub.faqItems.length > 0 && <JsonLd data={buildFaqPageSchema(hub.faqItems)} />}
      <DiemDenDetailPage
        regionName={regionName}
        hub={hub}
        routes={routes}
        heroImageUrl={getDestinationImageUrl(tinh, hub?.featuredImageUrl)}
      />
    </>
  );
}
