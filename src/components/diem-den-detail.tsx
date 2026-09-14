import Link from "next/link";
import { ArrowRight, Clock3, Milestone, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { routeHref, routePriceKicker, type Route } from "@/types/route";
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
      { label: "Câu hỏi thường gặp", href: "#faq" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

function RegionRouteCard({ route }: { route: Route }) {
  return (
    <Link className="route-ticket related-ticket" href={routeHref(route)}>
      <div className="rt-price">
        <span>{routePriceKicker(route)}</span>
        <b>{route.price}</b>
      </div>
      <div className="rt-body">
        <div className="rt-route">
          <span>{route.from}</span>
          <ArrowRight size={16} />
          <span>{route.to}</span>
        </div>
        <div className="rt-meta">
          {route.time && <span><Clock3 size={13} /> {route.time}</span>}
          {route.distance && <span><Milestone size={13} /> {route.distance}</span>}
          {route.vehicleTypes.length > 0 && <span className="rt-vehicles">{route.vehicleTypes.join(" · ")}</span>}
        </div>
      </div>
      <div className="rt-cta">Xem chi tiết <ArrowRight size={14} /></div>
    </Link>
  );
}

function RelatedResourceCard({
  href,
  kicker,
  title,
  description,
  cta,
}: {
  href: string;
  kicker: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link className="route-ticket related-ticket" href={href}>
      <div className="rt-price">
        <span>Khám phá</span>
        <b>{kicker}</b>
      </div>
      <div className="rt-body">
        <div className="rt-route"><span>{title}</span></div>
        <div className="rt-meta"><span>{description}</span></div>
      </div>
      <div className="rt-cta">{cta} <ArrowRight size={14} /></div>
    </Link>
  );
}

export function DiemDenDetailPage({
  regionName,
  hub,
  routes,
  heroImageUrl,
}: {
  regionName: string;
  hub?: DiemDen;
  routes: Route[];
  heroImageUrl?: string;
}) {
  const routeCount = routes.length;
  const heroDescription = routeCount > 0
    ? `Thuê xe nguyên chuyến đi ${regionName} với ${routeCount} tuyến đang phục vụ. Chủ động giờ khởi hành, loại xe và hành trình.`
    : `Thuê xe nguyên chuyến đi ${regionName}, chủ động giờ khởi hành, loại xe và hành trình.`;

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="0898 400 800" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <UnifiedHero
        eyebrow="THUÊ XE LIÊN TỈNH"
        title={`Thuê xe đi ${regionName}`}
        description={heroDescription}
        backgroundImage={heroImageUrl}
        backHref="/diem-den"
        backLabel="Tất cả điểm đến"
      />

      <section className="section-wrap blog-detail-content">
        <div className="section-heading">
          <div>
            <p className="section-label">THÔNG TIN ĐIỂM ĐẾN</p>
            <h2>Chủ động hành trình đi {regionName}.</h2>
          </div>
        </div>
        {hub ? (
          <article className="blog-detail-body" dangerouslySetInnerHTML={{ __html: hub.contentHtml }} />
        ) : (
          <article className="blog-detail-body">
            <p>
              Gocar VN nhận thuê xe nguyên chuyến đi {regionName} cho gia đình, nhóm khách và doanh nghiệp.
              Khách chủ động chọn giờ khởi hành, điểm đón trả và loại xe phù hợp, không phụ thuộc lịch trình cố định.
            </p>
            <p>
              Chọn một tuyến bên dưới để xem thông tin hành trình và mức giá hiện có. Với nhu cầu riêng hoặc tuyến
              chưa niêm yết, Gocar VN sẽ tư vấn phương án phù hợp trước khi xác nhận chuyến.
            </p>
          </article>
        )}
      </section>

      <section className="related-section section-wrap" id="routes">
        <div className="section-heading">
          <div>
            <p className="section-label">TUYẾN XE ĐI {regionName.toUpperCase()}</p>
            <h2>{routeCount > 0 ? `${routeCount} tuyến đang phục vụ.` : "Tư vấn tuyến theo nhu cầu."}</h2>
          </div>
          <Link className="text-link" href="/bang-gia">
            Xem bảng giá đầy đủ <ArrowRight size={17} />
          </Link>
        </div>
        {routeCount > 0 ? (
          <div className="route-list related-list">
            {routes.map((route) => <RegionRouteCard route={route} key={route.id} />)}
          </div>
        ) : (
          <p>Chưa có tuyến niêm yết cho khu vực này. Liên hệ Gocar VN để được tư vấn hành trình phù hợp.</p>
        )}
      </section>

      {hub && hub.faqItems.length > 0 && (
        <section className="section-wrap blog-detail-content" id="faq">
          <div className="blog-detail-faq">
            <p className="section-label">CÂU HỎI THƯỜNG GẶP</p>
            <h2>Thông tin cần biết khi thuê xe đi {regionName}.</h2>
            <div className="blog-faq-list">
              {hub.faqItems.map((item, index) => (
                <details className="blog-faq-item" key={`${item.question}-${index}`}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="related-section section-wrap">
        <div className="section-heading">
          <div>
            <p className="section-label">KHÁM PHÁ THÊM</p>
            <h2>Lên kế hoạch chuyến đi thuận tiện hơn.</h2>
          </div>
        </div>
        <div className="route-list related-list">
          <RelatedResourceCard href="/tuyen-duong" kicker="Tuyến" title="Tất cả tuyến đường" description="So sánh các hành trình đang phục vụ" cta="Khám phá" />
          <RelatedResourceCard href="/loai-xe" kicker="Xe" title="Chọn loại xe" description="Tìm xe phù hợp với số người và nhu cầu" cta="Xem loại xe" />
          <RelatedResourceCard href="/blog" kicker="Blog" title="Cẩm nang đi đường" description="Tham khảo kinh nghiệm trước chuyến đi" cta="Đọc cẩm nang" />
        </div>
      </section>

      <section className="vehicle-type-cta combo-final-cta section-wrap">
        <div>
          <p className="section-label">CẦN TƯ VẤN HÀNH TRÌNH?</p>
          <h2>Đặt xe đi {regionName}.</h2>
          <p>Gọi Gocar VN để được tư vấn tuyến, loại xe và phương án phù hợp trước khi xác nhận chuyến.</p>
        </div>
        <a className="button button-primary" href="tel:0898400800">
          Gọi 0898 400 800 <Phone size={16} />
        </a>
      </section>

      <SiteFooter
        tagline={<>Đi đâu cũng có Gocar VN.<br />Kết nối những hành trình tử tế.</>}
        phone="1900 6789"
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright="© 2026 Gocar VN"
        madeFor="Made for the road."
        brandMark="GC"
        brandName="GOCAR VN"
      />
    </main>
  );
}
