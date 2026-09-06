import Link from "next/link";
import { ArrowRight, Check, Clock3, Milestone, Phone, Star } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { VehicleArt } from "@/components/vehicle-type-landing";
import { comboDescriptionOrDefault } from "@/lib/combo";
import type { Route, VehiclePrice } from "@/types/route";
import type { VehicleCategory } from "@/types/vehicle-category";
import type { Testimonial } from "@/types/testimonial";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Loại xe", href: "/loai-xe" }, { label: "Đội xe", href: "/doi-xe" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

/**
 * Trang kết hợp /tuyen-duong/[slug]/[loai-xe] (Ngày 14) — landing SEO hẹp cho đúng 1 tổ hợp
 * cụ thể (vd "thuê xe 16 chỗ đi Vũng Tàu"). Nguồn dữ liệu:
 * - route + vehiclePrice: từ pricingByVehicle, đúng nguồn duy nhất mục 3 kiến trúc kỹ thuật.
 * - category: nội dung tĩnh 4 loại xe (data/vehicle-categories.ts, giống Ngày 13).
 * - testimonials: mock tạm (data/testimonials.ts), thay bằng CPT testimonial thật Ngày 18.
 */
export function ComboLandingPage({
  route,
  vehiclePrice,
  category,
  testimonials,
}: {
  route: Route;
  vehiclePrice: VehiclePrice;
  category: VehicleCategory;
  testimonials: Testimonial[];
}) {
  const description = comboDescriptionOrDefault(route, vehiclePrice);

  return (
    <main className="site-shell vehicle-type-page combo-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="#booking" />

      <section className="vehicle-type-hero">
        <div className="vehicle-type-hero-copy">
          <Link className="back-link" href={`/tuyen-duong/${route.slug}`}>← Tuyến {route.from} – {route.to}</Link>
          <p className="eyebrow"><span className="eyebrow-line" /> {category.label} · {route.from.toUpperCase()} → {route.to.toUpperCase()}</p>
          <h1>Thuê xe {category.label.toLowerCase()}<br /><em>đi {route.to}</em></h1>
          <p>{description}</p>
          <Link className="button button-primary" href="#booking">Đặt xe {category.label.toLowerCase()} <ArrowRight size={16} /></Link>
        </div>
        <VehicleArt category={category} />
      </section>

      <section className="section-wrap combo-price-section">
        <div className="section-heading-row">
          <div><p className="section-label">GIÁ THAM KHẢO</p><h2>Giá thuê xe {category.label.toLowerCase()} tuyến này.</h2></div>
          <div className="vehicle-type-bullets">
            <span><Clock3 size={16} /> {route.time}</span>
            <span><Milestone size={16} /> {route.distance}</span>
          </div>
        </div>
        <div className="detail-price-grid combo-price-grid">
          <article className="detail-price-card">
            <span className="vehicle-chip">{vehiclePrice.vehicleType}</span>
            <strong>{vehiclePrice.price}</strong>
            <small>Một chiều · Giá tham khảo, thay đổi theo mùa/lễ</small>
            <a href="#booking">Đặt xe ngay <ArrowRight size={14} /></a>
          </article>
        </div>
      </section>

      <section className="section-wrap vehicle-type-amenities">
        <p className="section-label">TIỆN ÍCH LOẠI XE NÀY</p>
        <div className="vehicle-type-amenity-grid">
          {category.amenities.map((item) => (
            <div key={item}>
              <Check size={20} />
              <strong>{item}</strong>
              <p>Được chuẩn bị sẵn cho hành trình {route.from} – {route.to}.</p>
            </div>
          ))}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="section-wrap combo-testimonials">
          <p className="section-label">KHÁCH ĐÃ ĐI NÓI GÌ</p>
          <div className="combo-testimonial-grid">
            {testimonials.map((t) => (
              <article className="combo-testimonial-card" key={t.id}>
                <div className="combo-testimonial-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < t.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p>{t.quote}</p>
                <div className="combo-testimonial-who">
                  <span className="combo-testimonial-avatar">{t.initials}</span>
                  <b>{t.name}</b>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section-wrap combo-back-links">
        <Link className="text-link" href={`/tuyen-duong/${route.slug}`}>Xem đầy đủ tuyến {route.from} – {route.to} <ArrowRight size={15} /></Link>
        <Link className="text-link" href={`/loai-xe/${category.slug}`}>Xem đầy đủ loại xe {category.label} <ArrowRight size={15} /></Link>
      </section>

      <section className="vehicle-type-cta" id="booking">
        <div>
          <p className="section-label">SẴN SÀNG LÊN ĐƯỜNG?</p>
          <h2>Đặt xe {category.label.toLowerCase()} đi {route.to} ngay hôm nay.</h2>
          <p>Để lại thông tin hoặc gọi hotline, đội ngũ Xe Miền Nam xác nhận trong ít phút.</p>
        </div>
        <a className="button button-primary" href="tel:19006789">Gọi 1900 6789 <Phone size={16} /></a>
      </section>

      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}
