import type { Metadata } from "next";
import { fetchPromotions } from "@/lib/api/promotions";
import { PromotionsPage } from "@/components/promotions-page";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Khuyến mãi thuê xe | Gocar VN",
  description: "Các chương trình ưu đãi giá thuê xe theo tuyến và loại xe tại Gocar VN — cập nhật thường xuyên.",
  path: "/khuyen-mai",
});

/** Server Component — gọi fetchPromotions() (WP REST API thật + fallback mock, Ngày 18). ISR áp dụng qua revalidate trong wpFetch(). */
export default async function Page() {
  const promotions = await fetchPromotions();
  return <PromotionsPage promotions={promotions} />;
}
