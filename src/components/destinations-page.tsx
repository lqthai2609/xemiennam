import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { RouteFinderForm } from "@/components/route-finder-form";
import { navItems } from "@/data/nav";
import type { DestinationCard } from "@/types/diem-den";
import type { RouteFinderProvince } from "@/lib/route-finder";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Cẩm nang đi đường", href: "/blog" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Chính sách huỷ chuyến", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

export function DestinationsPage({
  destinations,
  finderProvinces,
}: {
  destinations: DestinationCard[];
  finderProvinces: RouteFinderProvince[];
}) {
  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />
      <section className="destination-index-hero">
        <p className="eyebrow"><span className="eyebrow-line" /> MỞ RỘNG HÀNH TRÌNH</p>
        <h1>Đi đâu,<br /><em>Xe Miền Nam có tuyến.</em></h1>
        <p>Mỗi điểm đến là một cách đi khác nhau. Chọn khu vực bạn muốn đến để xem các tuyến xe đang chạy và bắt đầu lên lịch.</p>
      </section>
      <RouteFinderForm provinces={finderProvinces} />
      <section className="section-wrap destination-index-content" aria-labelledby="destination-list-title">
        <div className="section-heading-row">
          <div><p className="section-label">ĐIỂM ĐẾN PHỔ BIẾN</p><h2 id="destination-list-title">Chọn nơi bạn muốn đến.</h2></div>
          <span className="heading-note">{destinations.length} khu vực</span>
        </div>
        {destinations.length > 0 ? (
          <div className="destination-grid">
            {destinations.map((destination) => (
              <Link className="destination-card" href={`/tuyen-duong/${destination.slug}`} key={destination.slug} aria-label={`Xem các tuyến tại ${destination.name}`}>
                <div className="destination-card-media">
                  {destination.imageUrl ? <img src={destination.imageUrl} alt={`Phong cảnh ${destination.name}`} /> : <div className="destination-card-fallback" aria-hidden="true"><MapPin /></div>}
                  <span className="destination-card-count">{destination.routeCount} tuyến đang chạy</span>
                </div>
                <div className="destination-card-copy">
                  <h2>{destination.name}</h2>
                  <p>{destination.blurb}</p>
                  <span className="destination-card-link">Xem các tuyến <ArrowRight /></span>
                </div>
              </Link>
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
