import Link from "next/link";
import { ArrowRight, BadgePercent, CalendarDays, Phone, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { navItems } from "@/data/nav";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { PromotionCard } from "@/components/promotion-card";
import type { PublicPromotionCard } from "@/lib/api/promotions";
import { SITE_HOTLINE, SITE_HOTLINE_TEL } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";

/** Server-resolved amounts and the existing expiry lease remain authoritative. */
export function PromotionsPage({ promotions }: { promotions: PublicPromotionCard[] }) {
  return <main className="site-shell home-redesign promotions-page">
    <SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={"tel:" + SITE_HOTLINE_TEL} ctaLabel="Nhắn Zalo" ctaHref={getZaloChatLink()} homeDesign />
    <div className="promotions-width">
      <PublicBreadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Khuyến mãi" }]} />
      <section className="promotions-hero" aria-labelledby="promotions-title">
        <div><p className="home-eyebrow">THÔNG TIN ƯU ĐÃI THEO CHUYẾN</p><h1 id="promotions-title">Khuyến mãi<br />cho hành trình của bạn</h1><p>Chương trình được công bố khi có thông tin đã xác nhận. Giá và điều kiện luôn gắn với đúng tuyến, chiều, loại xe và gói hành trình.</p>
          <div className="promotions-actions"><Link href="/bang-gia" className="home-button home-button-primary">Xem giá hiện hành <ArrowRight size={17} /></Link><a href={"tel:" + SITE_HOTLINE_TEL} className="home-button home-button-outline"><Phone size={17} /> Gọi tư vấn</a></div>
        </div>
        <div className="promotions-hero-info"><BadgePercent size={52} aria-hidden="true" /><h2>{promotions.length ? "Xem chương trình và điều kiện" : "Hiện chưa có chương trình đang áp dụng"}</h2><p>{promotions.length ? "Chọn đúng chuyến để đối chiếu giá và phạm vi ưu đãi." : "Bạn vẫn có thể xem bảng giá hiện hành và trao đổi lịch trình để nhận tư vấn."}</p><Link href={promotions.length ? "#promotion-list" : "/tuyen-duong"}>{promotions.length ? "Xem các chuyến có ưu đãi" : "Tìm tuyến phù hợp"} <ArrowRight size={16} /></Link></div>
      </section>
      <section className="promotions-section" id="promotion-list" aria-labelledby="promotion-list-title">
        <header><p className="home-eyebrow">ƯU ĐÃI HIỆN HÀNH</p><h2 id="promotion-list-title">Chương trình đang được công bố</h2></header>
        {promotions.length ? <div className="promotions-card-grid">{promotions.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} />)}</div> : <div className="promotions-empty"><span><BadgePercent size={32} aria-hidden="true" /></span><div><h3>Hiện chưa có chương trình khuyến mãi đang áp dụng.</h3><p>Chúng tôi sẽ hiển thị chương trình tại đây khi có thông tin đã xác nhận. Giá chuyến đi hiện hành vẫn được tra cứu theo nhu cầu của bạn.</p></div><Link href="/bang-gia" className="home-button home-button-outline">Xem bảng giá <ArrowRight size={17} /></Link></div>}
      </section>
      <section className="promotions-section" aria-labelledby="promotion-guide-title"><header><h2 id="promotion-guide-title">Đối chiếu ưu đãi cho đúng chuyến</h2><p>Thông tin cần xem trước khi tiếp tục đặt xe.</p></header><div className="promotions-guide-grid"><article><RouteIcon size={26} /><h3>Đúng hành trình</h3><p>Kiểm tra tuyến, chiều chuyến đi, loại xe và gói đang hiển thị.</p></article><article><CalendarDays size={26} /><h3>Đúng thời gian áp dụng</h3><p>Xem thời hạn và điều kiện của từng chương trình. Ưu đãi hết hạn cần được kiểm tra lại.</p></article><article><ShieldCheck size={26} /><h3>Xác nhận trước chuyến</h3><p>Đối chiếu điểm đón trả, lịch trình, giá và điều kiện với tư vấn viên.</p></article></div></section>
      <section className="promotions-section promotions-faq" aria-labelledby="promotion-faq-title"><header><h2 id="promotion-faq-title">Câu hỏi thường gặp</h2></header><details><summary>Vì sao tôi chưa thấy chương trình khuyến mãi?</summary><p>Trang chỉ hiển thị ưu đãi đã được công bố cho chuyến cụ thể. Khi chưa có chương trình đang áp dụng, bạn vẫn có thể xem giá hiện hành.</p></details><details><summary>Giá ưu đãi có áp dụng cho mọi tuyến và loại xe không?</summary><p>Phạm vi phụ thuộc từng chương trình. Hãy xem đúng tuyến, chiều, xe, gói và điều kiện trên thẻ ưu đãi.</p></details><details><summary>Nếu chương trình hết hạn khi đang xem thì sao?</summary><p>Phần giá ưu đãi sẽ chuyển về thông tin giá chưa giảm và hướng dẫn kiểm tra lại để được xác nhận giá hiện hành.</p></details></section>
      <section className="promotions-final"><div><h2>Đã có lịch trình cho chuyến đi?</h2><p>Chọn tuyến để xem giá hoặc gọi {SITE_HOTLINE} để được tư vấn.</p></div><div className="promotions-actions"><Link href="/tuyen-duong" className="home-button home-button-primary">Chọn hành trình <ArrowRight size={17} /></Link><a href={"tel:" + SITE_HOTLINE_TEL} className="home-button home-button-outline"><Phone size={17} /> Gọi tư vấn</a></div></section>
    </div><SiteFooter />
  </main>;
}
