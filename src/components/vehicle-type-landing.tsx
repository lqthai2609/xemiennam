import Link from "next/link";
import { ArrowRight, BusFront, Check, MapPin, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { MediaPhoto } from "@/components/media-photo";
import { BlogCard } from "@/components/blog-card";
import { VehicleRealGallery } from "@/components/vehicle-real-gallery";
import { VehicleTypeHeroVariants } from "@/components/vehicle-type-hero-variants";
import type { BlogPost } from "@/types/blog";
import type { VehicleCategory } from "@/types/vehicle-category";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Loại xe", href: "/loai-xe" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

export function VehicleArt({ category }: { category: VehicleCategory }) {
  return (
    <div className={`vehicle-type-art vehicle-art ${category.color}`} role="img" aria-label={`${category.label} - ${category.title}`}>
      {category.imageUrl ? <MediaPhoto src={category.imageUrl} alt={`${category.label} - ${category.title}`} /> : <BusFront />}
      <span>{category.label}</span>
    </div>
  );
}

type RouteLink = { label: string; href: string };
type PriceRow = { route: string; price: string; note: string };
type ServiceLink = { title: string; description: string; href: string };

/** Trang chi tiết 1 loại xe (Ngày 13). `category` là nội dung tĩnh; routePrices/
 * relatedRoutes/services/galleryImages/relatedPosts đều tính từ dữ liệu thật (fetchVehicles/
 * getPricingTable/fetchServices/fetchPostsByVehicleType) ngay ở Server Component cha — xem
 * app/loai-xe/[slug]/page.tsx. Ngày 25d: bỏ khối "XE ĐANG CÓ" (card xe cụ thể) theo yêu cầu. */
export function VehicleTypeLanding({
  category,
  routePrices,
  relatedRoutes,
  services,
  galleryImages,
  relatedPosts,
}: {
  category: VehicleCategory;
  routePrices: PriceRow[];
  relatedRoutes: RouteLink[];
  services: ServiceLink[];
  galleryImages: string[];
  relatedPosts: BlogPost[];
}) {
  return (
    <main className="site-shell vehicle-type-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Thuê xe ngay" ctaHref="/#booking" />

      <VehicleTypeHeroVariants category={category} />

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

      {galleryImages.length > 0 && (
        <section className="section-wrap vehicle-type-gallery-section">
          <div className="section-heading-row"><div><p className="section-label">HÌNH ẢNH THỰC TẾ</p><h2>Nhìn trước chuyến đi của bạn.</h2></div></div>
          <VehicleRealGallery images={galleryImages} />
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

      {relatedPosts.length > 0 && (
        <section className="section-wrap vehicle-type-related-posts">
          <div className="section-heading-row"><div><p className="section-label">BÀI VIẾT LIÊN QUAN</p><h2>Thêm cảm hứng cho hành trình.</h2></div><Link href="/blog" className="text-link">Xem tất cả bài viết <ArrowRight size={15} /></Link></div>
          <div className="blog-grid vehicle-type-related-post-grid">
            {relatedPosts.slice(0, 3).map((post) => <BlogCard key={post.id} post={post} />)}
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
        <div className="vehicle-category-cards">
          {categories.map((category) => (
            <Link href={`/loai-xe/${category.slug}`} className="vehicle-category-card" key={category.slug}>
              <VehicleArt category={category} />
              <div className="vehicle-category-card-body">
                <div className="vehicle-category-card-heading"><p>{category.label}</p><span>{category.type}</span></div>
                <h3>{category.title}</h3>
                <p className="vehicle-category-summary">{category.shortDescription}</p>
                <div className="vehicle-category-card-meta"><span className="vehicle-category-badge">{category.driveOptions.join(" / ")}</span><strong>{category.startingPrice}</strong></div>
                <span className="vehicle-category-link">Xem chi tiết <ArrowRight size={15} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}
