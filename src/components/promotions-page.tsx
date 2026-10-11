import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { PromotionCard } from "@/components/promotion-card";
import type { PublicPromotionCard } from "@/lib/api/promotions";
import { UnifiedHero } from "@/components/unified-hero";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

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

/** Cards use the same server presentation as route pricing; no client discount logic. */
export function PromotionsPage({ promotions }: { promotions: PublicPromotionCard[] }) {
  return (
    <main className="site-shell">
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="/#booking"
      />

      <UnifiedHero eyebrow="KHUYẾN MÃI" title={promotions.length > 0 ? <>Thông tin<br /><em>khuyến mãi.</em></> : <>Hiện chưa có<br /><em>chương trình đang áp dụng.</em></>} description="Chương trình và điều kiện áp dụng được công bố khi có thông tin đã xác nhận." />

      <section className="section-wrap khuyen-mai-content">
        {promotions.length === 0 ? (
          <p className="promo-empty">Hiện chưa có chương trình khuyến mãi đang áp dụng. Bạn có thể xem bảng giá hiện hành hoặc liên hệ để được tư vấn.</p>
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
            Đi đâu cũng có {SITE_NAME}.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}`}
        madeFor="Made for the road."
        brandName={SITE_NAME}
      />
    </main>
  );
}
