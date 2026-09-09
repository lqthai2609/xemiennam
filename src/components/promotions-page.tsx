import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { PromotionCard } from "@/components/promotion-card";
import type { Promotion } from "@/types/promotion";
import { UnifiedHero } from "@/components/unified-hero";

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Bảng giá", href: "/bang-gia" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

/**
 * Trang /khuyen-mai (Ngày 18) — nhận `promotions` qua props, dữ liệu đã được fetchPromotions()
 * lấy từ WP REST API thật + fallback mock (lib/api/promotions.ts) ở Server Component cha
 * (app/khuyen-mai/page.tsx). Không cần lọc client-side — promotions đã được sắp xếp sẵn
 * (đang áp dụng trước, hết hạn xuống cuối) nên hiển thị nguyên trạng theo đúng thứ tự nhận vào.
 */
export function PromotionsPage({ promotions }: { promotions: Promotion[] }) {
  const activeCount = promotions.filter((p) => !p.isExpired).length;

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <UnifiedHero eyebrow="KHUYẾN MÃI" title={<>Ưu đãi<br /><em>đang chờ bạn.</em></>} description="Các chương trình giảm giá theo tuyến và loại xe, cập nhật thường xuyên." showFinder={false} />

      <section className="section-wrap khuyen-mai-content">
        {promotions.length === 0 ? (
          <p className="promo-empty">Hiện chưa có chương trình khuyến mãi nào. Quay lại sau nhé!</p>
        ) : (
          <div className="promo-grid">
            {promotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter
        tagline={
          <>
            Đi đâu cũng có Xe Miền Nam.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
        phone="1900 6789"
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright="© 2026 Xe Miền Nam"
        madeFor="Made for the road."
      />
    </main>
  );
}
