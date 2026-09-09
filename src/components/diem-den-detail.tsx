import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, MapPin, Milestone, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { formatVNDate } from "@/lib/wp";
import { routeHref, type Route } from "@/types/route";
import type { DiemDen } from "@/types/diem-den";
import { UnifiedHero } from "@/components/unified-hero";

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Cẩm nang đi đường", href: "/blog" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Chính sách huỷ chuyến", href: "#" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

/** Thẻ tuyến — cùng markup .route-ticket đã dùng ở RouteDetailPage/BlogDetailPage, chỉ đổi href sang routeHref() lồng theo tỉnh. */
function RegionRouteCard({ route }: { route: Route }) {
  return (
    <Link className="route-ticket related-ticket" href={routeHref(route)}>
      <div className="rt-price">
        <span>Giá từ</span>
        <b>{route.price}</b>
      </div>
      <div className="rt-body">
        <div className="rt-route">
          <span>{route.from}</span>
          <ArrowRight size={16} />
          <span>{route.to}</span>
        </div>
        <div className="rt-meta">
          <span>
            <Clock3 size={13} /> {route.time}
          </span>
          <span>
            <Milestone size={13} /> {route.distance}
          </span>
          <span className="rt-vehicles">{route.vehicleTypes.join(" · ")}</span>
        </div>
      </div>
      <div className="rt-cta">
        Xem chi tiết <ArrowRight size={14} />
      </div>
    </Link>
  );
}

/**
 * Trang hub tỉnh `/tuyen-duong/[tinh]` (Ngày 25) — 2 nguồn dữ liệu độc lập:
 * - `hub`: nội dung biên tập từ CPT `diem_den` (mô tả, FAQ) — CÓ THỂ `undefined` nếu WP
 *   chưa nhập bài cho tỉnh này, trang vẫn hoạt động bình thường (chỉ ẩn khối nội dung/FAQ).
 * - `routes`: danh sách tuyến cụ thể trong tỉnh, lọc theo `regionSlug` (lib/api/routes.ts).
 */
export function DiemDenDetailPage({
  regionName,
  hub,
  routes,
}: {
  regionName: string;
  hub?: DiemDen;
  routes: Route[];
}) {
  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <UnifiedHero eyebrow="ĐIỂM ĐẾN" title={regionName} description={hub ? "Thông tin điểm đến và các tuyến xe nguyên chuyến phù hợp." : `Thuê xe nguyên chuyến đi khắp khu vực ${regionName}.`} backHref="/diem-den" backLabel="Tất cả điểm đến" />
      <section className="section-wrap blog-detail-content">
        {hub ? (
          <article className="blog-detail-body" dangerouslySetInnerHTML={{ __html: hub.contentHtml }} />
        ) : (
          <article className="blog-detail-body">
            <p>
              Xe Miền Nam nhận thuê nguyên chuyến đi khắp khu vực {regionName}. Khách chủ động chọn khung giờ khởi
              hành, không phụ thuộc lịch trình cố định.
            </p>
          </article>
        )}

        {hub && hub.faqItems.length > 0 && (
          <section className="blog-detail-faq">
            <p className="section-label">CÂU HỎI THƯỜNG GẶP</p>
            <div className="blog-faq-list">
              {hub.faqItems.map((item, index) => (
                <details className="blog-faq-item" key={`${item.question}-${index}`}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </section>

      <section className="related-section section-wrap">
        <div className="section-heading">
          <div>
            <p className="section-label">CÁC TUYẾN TRONG KHU VỰC</p>
            <h2>Chọn đúng tuyến bạn cần.</h2>
          </div>
          <Link className="text-link" href="/bang-gia">
            Xem bảng giá đầy đủ <ArrowRight size={17} />
          </Link>
        </div>
        <div className="route-list related-list">
          {routes.map((route) => (
            <RegionRouteCard route={route} key={route.id} />
          ))}
        </div>
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
