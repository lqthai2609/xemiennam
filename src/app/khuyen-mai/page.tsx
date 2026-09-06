import type { Metadata } from "next";
import { fetchPromotions } from "@/lib/api/promotions";
import { PromotionsPage } from "@/components/promotions-page";

export const metadata: Metadata = {
  title: "Khuyến mãi thuê xe | Xe Miền Nam",
  description: "Các chương trình ưu đãi giá thuê xe theo tuyến và loại xe tại Xe Miền Nam — cập nhật thường xuyên.",
};

/** Server Component — gọi fetchPromotions() (WP REST API thật + fallback mock, Ngày 18). ISR áp dụng qua revalidate trong wpFetch(). */
export default async function Page() {
  const promotions = await fetchPromotions();
  return <PromotionsPage promotions={promotions} />;
}
