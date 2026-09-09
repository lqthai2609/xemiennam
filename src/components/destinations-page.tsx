import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { SubpageHero, defaultSubpageHeroImage } from "@/components/subpage-hero";
import { DestinationCardTile } from "@/components/destination-card-tile";
import { navItems } from "@/data/nav";
import type { DestinationCard } from "@/types/diem-den";
import type { Route } from "@/types/route";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Cẩm nang đi đường", href: "/blog" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Chính sách huỷ chuyến", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

export function DestinationsPage({
  destinations,
  routes,
}: {
  destinations: DestinationCard[];
  routes: Route[];
}) {
  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />
      <SubpageHero
        title="Đi đâu, Xe Miền Nam có tuyến."
        description="Mỗi điểm đến là một cách đi khác nhau. Chọn khu vực bạn muốn đến để xem các tuyến xe đang chạy và bắt đầu lên lịch."
        backgroundImage={defaultSubpageHeroImage}
        routes={routes}
      />
      <section className="section-wrap destination-index-content" aria-labelledby="destination-list-title">
        <div className="section-heading-row">
          <div><p className="section-label">ĐIỂM ĐẾN PHỔ BIẾN</p><h2 id="destination-list-title">Chọn nơi bạn muốn đến.</h2></div>
          <span className="heading-note">{destinations.length} khu vực</span>
        </div>
        {destinations.length > 0 ? (
          <div className="destination-grid">
            {destinations.map((destination) => (
              <DestinationCardTile destination={destination} key={destination.slug} />
            ))}
          </div>
        ) : <p className="blog-empty">Danh sách điểm đến đang được cập nhật.</p>}
      </section>
      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}

export type { DestinationCard };

/** Giữ dữ liệu trang ở server, component chỉ nhận props theo đúng hợp đồng UI. */
export default DestinationsPage;
