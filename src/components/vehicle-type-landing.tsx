import Link from "next/link";
import { ArrowRight, BusFront, Check, MapPin, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { VehicleCard } from "@/components/vehicle-results";
import type { Vehicle } from "@/types/vehicle";
import type { VehicleCategory } from "@/types/vehicle-category";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Đội xe", href: "/doi-xe" }, { label: "Loại xe", href: "/loai-xe" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

export function VehicleArt({ category }: { category: VehicleCategory }) {
  return (
    <div className={`vehicle-type-art vehicle-art ${category.color}`} role="img" aria-label={`${category.label} - ${category.title}`}>
      <BusFront />
      <span>{category.label}</span>
    </div>
  );
}

type RouteLink = { label: string; href: string };
type PriceRow = { route: string; price: string; note: string };
type ServiceLink = { title: string; description: string; href: string };

/** Trang chi tiết 1 loại xe (Ngày 13). `category` là nội dung tĩnh; vehicles/routePrices/
 * relatedRoutes/services đều tính từ dữ liệu thật (fetchVehicles/getPricingTable/fetchServices)
 * lọc theo `category.type` ngay ở Server Component cha — xem app/loai-xe/[slug]/page.tsx. */
export function VehicleTypeLanding({
  category,
  vehicles,
  routePrices,
  relatedRoutes,
  services,
}: {
  category: VehicleCategory;
  vehicles: Vehicle[];
  routePrices: PriceRow[];
  relatedRoutes: RouteLink[];
  services: ServiceLink[];
}) {
  return (
    <main className="site-shell vehicle-type-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Thuê xe ngay" ctaHref="/#booking" />

      <section className="vehicle-type-hero">
        <div className="vehicle-type-hero-copy">
          <Link className="back-link" href="/loai-xe">← Tất cả loại xe</Link>
          <p className="eyebrow"><span className="eyebrow-line" /> {category.label}</p>
          <h1>{category.title}</h1>
          <p>{category.description}</p>
          <Link className="button button-primary" href="/#booking">Tư vấn lịch trình <ArrowRight size={16} /></Link>
        </div>
        <VehicleArt category={category} />
      </section>

      <section className="section-wrap vehicle-type-intro">
        <div>
          <p className="section-label">PHÙ HỢP VỚI BẠN</p>
          <h2>Đi đúng nhu cầu, nhẹ đầu cả chuyến đi.</h2>
        </div>
        <div className="vehicle-type-bullets">
          {category.audience.map((item) => <span key={item}><ShieldCheck size={16} /> {item}</span>)}
        </div>
      </section>

      <section className="section-wrap vehicle-type-amenities">
        <p className="section-label">TIỆN ÍCH THƯỜNG CÓ</p>
        <div className="vehicle-type-amenity-grid">
          {category.amenities.map((item) => (
            <div key={item}>
              <Check size={20} />
              <strong>{item}</strong>
              <p>Được chuẩn bị để hành trình thoải mái hơn từ lúc khởi hành.</p>
            </div>
          ))}
        </div>
      </section>

      {vehicles.length > 0 && (
        <section className="section-wrap vehicle-type-vehicles">
          <div className="section-heading-row">
            <div><p className="section-label">XE ĐANG CÓ</p><h2>Chọn chiếc xe hợp với hành trình.</h2></div>
            <Link href="/doi-xe" className="text-link">Xem toàn bộ đội xe <ArrowRight size={15} /></Link>
          </div>
          <div className="vehicle-grid vehicle-type-grid">
            {vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
          </div>
        </section>
      )}

      {routePrices.length > 0 && (
        <section className="section-wrap vehicle-type-routes">
          <div className="section-heading-row">
            <div><p className="section-label">GIÁ THAM KHẢO</p><h2>Bảng giá theo tuyến phổ biến.</h2></div>
            <p className="heading-note">Giá tham khảo,<br />thay đổi theo mùa/lễ.</p>
          </div>
          <div className="vehicle-price-table">
            {routePrices.map((item, index) => (
              <div className="vehicle-type-price-row" key={`${item.route}-${index}`}>
                <span>{item.route}</span><strong>{item.price}</strong><small>{item.note}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {relatedRoutes.length > 0 && (
        <section className="section-wrap vehicle-type-related-routes">
          <div className="section-heading-row"><div><p className="section-label">TUYẾN CÓ THỂ ĐI</p><h2>Đi đâu bằng {category.label.toLowerCase()}?</h2></div></div>
          <div className="departure-list">
            {relatedRoutes.map((route) => (
              <Link key={route.href} href={route.href} className="vehicle-chip">{route.label}</Link>
            ))}
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section className="section-wrap vehicle-type-services">
          <p className="section-label">DỊCH VỤ PHÙ HỢP</p>
          <div className="vehicle-service-grid">
            {services.map((service) => (
              <Link href={service.href} className="vehicle-service-card" key={service.href}>
                <MapPin size={20} />
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="vehicle-type-cta">
        <div>
          <p className="section-label">SẴN SÀNG LÊN ĐƯỜNG?</p>
          <h2>Cho chúng tôi biết bạn cần đi đâu.</h2>
          <p>Nhận tư vấn xe và lịch trình phù hợp trong một cuộc gọi.</p>
        </div>
        <Link className="button button-primary" href="/#booking">Đặt xe ngay <ArrowRight size={16} /></Link>
      </section>

      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}

export function VehicleCategoryIndex({ categories }: { categories: VehicleCategory[] }) {
  return (
    <main className="site-shell vehicle-type-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Thuê xe ngay" ctaHref="/#booking" />
      <section className="vehicle-type-index-hero">
        <p className="eyebrow"><span className="eyebrow-line" /> CHỌN ĐÚNG CHIẾC XE</p>
        <h1>Mỗi hành trình,<br /><em>một lựa chọn vừa vặn.</em></h1>
        <p>Khám phá các nhóm xe được thiết kế cho từng kiểu chuyến đi — từ gia đình nhỏ đến đoàn lớn.</p>
      </section>
      <section className="section-wrap vehicle-category-grid">
        <div className="vehicle-category-cards vehicle-category-cards-four">
          {categories.map((category) => (
            <Link href={`/loai-xe/${category.slug}`} className="vehicle-category-card" key={category.slug}>
              <VehicleArt category={category} />
              <div>
                <p>{category.label}</p>
                <h3>{category.title}</h3>
                <span>Xem loại xe <ArrowRight size={15} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}
