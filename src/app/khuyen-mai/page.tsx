import type { Metadata } from "next";
import { fetchPromotions } from "@/lib/api/promotions";
import { PromotionsPage } from "@/components/promotions-page";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Khuyến mãi thuê xe | Alo Đặt Xe",
  description: "Thông tin chương trình khuyến mãi của Alo Đặt Xe và điều kiện áp dụng theo tuyến, chiều, loại xe và gói hành trình.",
  path: "/khuyen-mai",
  // SEO-009: indexability requires a separate editorial acceptance, not a count.
  noIndex: true,
});

/** Server Component — gọi fetchPromotions() (WP REST API thật + fallback mock, Ngày 18). ISR áp dụng qua revalidate trong wpFetch(). */
export default async function Page() {
  const promotions = await fetchPromotions();
  return <PromotionsPage promotions={promotions} />;
}
