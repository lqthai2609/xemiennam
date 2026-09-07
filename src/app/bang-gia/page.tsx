import type { Metadata } from "next";
import { fetchRoutes } from "@/lib/api/routes";
import { BangGiaPageClient } from "@/components/bang-gia-page-client";

export const metadata: Metadata = {
  title: "Bảng giá thuê xe nguyên chiếc theo tuyến | Xe Miền Nam",
  description: "Bảng giá tham khảo cho thuê xe nguyên chiếc theo từng tuyến và loại xe (4–7/16–29/45 chỗ/Limousine), cập nhật theo dữ liệu mới nhất.",
};

/**
 * Server Component — gọi fetchRoutes() (WP REST API thật, Ngày 12) rồi giao dữ liệu
 * cho BangGiaPageClient xử lý tìm kiếm client-side. ISR áp dụng qua revalidate trong
 * wpFetch(). route.pricingByVehicle đã được mapWPRouteToRoute() gộp sẵn từ đúng 1
 * nguồn (repeater pricing_by_vehicle qua src/lib/api/pricing.ts) — /bang-gia chỉ cần
 * đọc lại field này, không tự fetch/parse riêng (tránh lệch dữ liệu với các trang khác).
 *
 * Ngày 23 — "Cập nhật lần cuối" lấy modified MỚI NHẤT trong toàn bộ routes (bảng gộp
 * nhiều tuyến nên không có 1 mốc modified duy nhất như trang chi tiết 1 tuyến).
 */
export default async function BangGiaPage() {
  const routes = await fetchRoutes();
  const lastModified = routes
    .map((r) => r.modifiedDate)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  return <BangGiaPageClient routes={routes} lastModified={lastModified} />;
}
