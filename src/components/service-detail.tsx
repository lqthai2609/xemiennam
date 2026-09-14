import Link from "next/link";
import { ArrowRight, Check, Phone } from "lucide-react";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { navItems } from "@/data/nav";
import type { Service } from "@/types/service";
import { fallbackImages } from "@/components/service-card";
import { UnifiedHero } from "@/components/unified-hero";
import { SITE_NAME } from "@/lib/site-config";

export function ServiceDetail({ service }: { service: Service }) {
  const image = service.image ?? fallbackImages[service.icon];

  return (
    <main className="site-shell service-detail-page">
      <SiteHeader menuItems={navItems} hotline={service.hotline} ctaLabel="Thuê xe ngay" ctaHref="/#booking" />
      <UnifiedHero
        eyebrow="DỊCH VỤ THEO NHU CẦU"
        title={<>{service.name}<br /><em>đúng cách.</em></>}
        description={service.shortDescription}
        backgroundImage={image}
        backHref="/dich-vu"
        backLabel="Tất cả dịch vụ"
      />

      <section className="service-detail-content section-wrap">
        <div className="service-description">
          <p className="section-label">VÌ SAO CHỌN DỊCH VỤ NÀY</p>
          <h2>Được chuẩn bị<br />cho điều bạn cần.</h2>
          <p>{service.detailDescription}</p>
          {service.searchIntent && (
            <p><strong>Nhu cầu tìm kiếm chính:</strong> {service.searchIntent}</p>
          )}
        </div>

        <div className="service-detail-sections">
          {service.useCases && service.useCases.length > 0 && (
            <section>
              <p className="section-label">PHÙ HỢP KHI BẠN CẦN</p>
              <div className="service-type-list">
                {service.useCases.map((useCase) => (
                  <div className="service-type-card" key={useCase.title}>
                    <div>
                      <h3>{useCase.title}</h3>
                      <p>{useCase.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="section-label">LOẠI XE PHÙ HỢP</p>
            <div className="service-type-list">
              {service.vehicleTypes.map((type) => (
                <Link href={`/loai-xe/${type.slug}`} className="service-type-card" key={type.slug}>
                  <div>
                    <h3>{type.name}</h3>
                    {type.description && <p>{type.description}</p>}
                  </div>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          {service.suggestedVehicles.length > 0 && (
            <section>
              <p className="section-label">XE GỢI Ý CỤ THỂ</p>
              <div className="suggested-vehicle-list">
                {service.suggestedVehicles.map((vehicle) => (
                  <Link href={`/loai-xe/${vehicle.slug}`} className="suggested-vehicle-card" key={`${vehicle.slug}-${vehicle.name}`}>
                    <span className="suggested-vehicle-dot" />
                    <div>
                      <h3>{vehicle.name}</h3>
                      <p>{vehicle.detail}</p>
                    </div>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {service.relatedRoutes && service.relatedRoutes.length > 0 && (
            <section>
              <p className="section-label">TUYẾN ĐƯỜNG PHÙ HỢP</p>
              <div className="suggested-vehicle-list">
                {service.relatedRoutes.map((route) => (
                  <div className="suggested-vehicle-card" key={route.href}>
                    <span className="suggested-vehicle-dot" />
                    <div>
                      <h3><Link href={route.href}>{route.name}</Link></h3>
                      {route.summary && <p>{route.summary}</p>}
                      {route.combos.length > 0 && (
                        <p>
                          {route.combos.map((combo, index) => (
                            <span key={combo.href}>
                              {index > 0 ? " · " : ""}
                              <Link href={combo.href}>{combo.vehicleType}</Link>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <Link href={route.href} aria-label={`Xem tuyến ${route.name}`}><ArrowRight aria-hidden="true" /></Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="section-label">LƯU Ý RIÊNG CHO DỊCH VỤ NÀY</p>
            <ul className="service-notes">
              {service.notes.map((note) => (
                <li key={note}><Check aria-hidden="true" /><span>{note}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <section className="service-cta">
        <div>
          <p className="section-label">SẴN SÀNG LÊN ĐƯỜNG?</p>
          <h2>Để chúng tôi lo<br /><em>phần di chuyển.</em></h2>
        </div>
        <div className="service-cta-actions">
          <p>Tư vấn nhanh theo lịch trình và số người đi cùng.</p>
          <Link className="button button-dark" href="/#booking">Đặt lịch ngay <ArrowRight aria-hidden="true" /></Link>
          <a className="service-phone" href={`tel:${service.hotline.replace(/\s/g, "")}`}><Phone aria-hidden="true" /> {service.hotline}</a>
        </div>
      </section>

      <SiteFooter
        tagline={<>Đi đâu cũng có {SITE_NAME}.<br />Kết nối những hành trình tử tế.</>}
        phone={service.hotline}
        linkGroups={[
          { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Dịch vụ", href: "/dich-vu" }] },
          { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
        ]}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}`}
        madeFor="Made for the road."
      />
    </main>
  );
}
