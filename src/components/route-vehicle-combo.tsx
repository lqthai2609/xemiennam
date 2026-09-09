import Link from "next/link";
import { ArrowRight, CarFront, Check, Clock3, MessageCircle, Milestone, Phone, ShieldCheck, Star, Users, Luggage } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { BlogCard } from "@/components/blog-card";
import { MediaPhoto } from "@/components/media-photo";
import { RouteBookingActions } from "@/components/route-booking-actions";
import { comboDescriptionOrDefault } from "@/lib/combo";
import { routeHref, routeComboHref, type Route, type VehiclePrice } from "@/types/route";
import type { VehicleCategory } from "@/types/vehicle-category";
import type { Vehicle } from "@/types/vehicle";
import type { BlogPost } from "@/types/blog";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Cẩm nang đi đường", href: "/blog" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

function discountedPrice(price: string) {
  const amount = Number(price.replace(/[^0-9]/g, ""));
  if (!amount) return "";
  return `${Math.round((amount * 1.128) / 1000) * 1000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " đ";
}

function SimilarRouteCard({ route, vehicleSlug }: { route: Route; vehicleSlug: string }) {
  return <Link className="combo-similar-card" href={routeComboHref(route, vehicleSlug)}><span>{route.from} → {route.to}</span><strong>{route.price}</strong><small><Clock3 size={13} /> {route.time}</small><ArrowRight size={17} /></Link>;
}

export function ComboLandingPage({ route, vehiclePrice, category, similarRoutes, relatedPosts, vehicle }: {
  route: Route;
  vehiclePrice: VehiclePrice;
  category: VehicleCategory;
  similarRoutes: Route[];
  relatedPosts: BlogPost[];
  vehicle?: Vehicle;
}) {
  const description = comboDescriptionOrDefault(route, vehiclePrice);
  const routeLabel = `${route.from} – ${route.to}`;
  const oldPrice = discountedPrice(vehiclePrice.price);
  const seats = vehicle?.seats || (category.type === "Limousine" ? "8 khách" : `${category.type.replace(" chỗ", "")} khách`);
  // Ảnh loại xe chỉ được dùng trong card đặt xe, không gắn vào nền hero.
  const image = vehicle?.images[0] || category.imageUrl;

  return (
    <main className="site-shell combo-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="#booking" />
      <section className="combo-hero">
        <div className="combo-hero-copy">
          <Link className="back-link" href={routeHref(route)}>← Tuyến {routeLabel}</Link>
          <p className="eyebrow"><span className="eyebrow-line" /> {route.region} · {category.label}</p>
          <h1>Thuê xe {category.label.toLowerCase()}<br /><em>{route.from} → {route.to}</em></h1>
          <p>{description}</p>
          <div className="combo-hero-meta"><span><Clock3 size={16} /> {route.time}</span><span><Milestone size={16} /> {route.distance}</span><span><ShieldCheck size={16} /> Giá trọn gói</span></div>
        </div>
        <div className="combo-hero-card"><span>XE MIỀN NAM</span><strong>{category.label}</strong><small>ĐI TỬ TẾ TRÊN MỌI CUNG ĐƯỜNG</small></div>
      </section>

      <section className="section-wrap combo-booking-section" id="booking">
        <div className="section-heading"><div><p className="section-label">XE PHÙ HỢP CHO HÀNH TRÌNH</p><h2>Chọn xe, đặt chuyến ngay.</h2></div><p className="heading-note">Giá đã gồm phí cầu đường.<br />Không có phụ phí ẩn.</p></div>
        <article className="combo-vehicle-card">
          <div className="combo-vehicle-media">{image ? <MediaPhoto src={image} alt={vehicle?.name || vehiclePrice.vehicleType} /> : <CarFront size={76} strokeWidth={1.2} />}<strong>Xe {vehiclePrice.vehicleType} <span>(VIP)</span></strong></div>
          <div className="combo-vehicle-info">
            <div className="combo-vehicle-top"><div><h2>{vehicle?.name || `Xe ${vehiclePrice.vehicleType} TaxiGo`}</h2><div className="combo-rating"><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} /><span>4.9 · (1,250)</span></div></div><div className="combo-price"><del>{oldPrice}</del><strong>{vehiclePrice.price}</strong></div></div>
            <div className="combo-vehicle-divider" />
            <div className="combo-vehicle-details"><p><CarFront size={17} /> Xe sedan: Vios, Honda city, Elantra, Mazda...</p><p><Users size={17} /> {seats}</p><p><Luggage size={17} /> 2 vali</p></div>
            <div className="combo-vehicle-actions"><div><p className="combo-alert">▲ Giá đang rất rẻ, đặt sớm để giữ xe</p><p className="combo-included"><Check size={14} /> Giá trên đã bao gồm phí cao tốc, phí ra vào SB</p></div><RouteBookingActions route={routeLabel} vehicleType={vehiclePrice.vehicleType} price={vehiclePrice.price} /></div>
          </div>
        </article>
      </section>

      <section className="section-wrap combo-benefits"><div className="section-heading"><div><p className="section-label">THÔNG TIN HÀNH TRÌNH</p><h2>Một chuyến đi nhẹ tênh.</h2></div></div><div className="combo-benefit-grid"><div><ShieldCheck size={22} /><strong>Giá minh bạch</strong><p>Không phát sinh phụ phí. Nhân viên xác nhận trước khi khởi hành.</p></div><div><Clock3 size={22} /><strong>Đón tận nơi</strong><p>Linh hoạt điểm đón tại {route.from} và trả khách tại {route.to}.</p></div><div><MessageCircle size={22} /><strong>Hỗ trợ nhanh</strong><p>Luôn có đội ngũ hỗ trợ qua điện thoại và Zalo.</p></div></div></section>

      {similarRoutes.length > 0 && <section className="section-wrap combo-similar-section"><div className="section-heading"><div><p className="section-label">CÙNG TỈNH {route.region.toUpperCase()}</p><h2>Các tuyến tương tự.</h2></div><Link className="text-link" href={`/tuyen-duong/${route.regionSlug}`}>Xem tất cả tuyến <ArrowRight size={16} /></Link></div><div className="combo-similar-grid">{similarRoutes.map((item) => <SimilarRouteCard key={item.id} route={item} vehicleSlug={category.slug} />)}</div></section>}

      {relatedPosts.length > 0 && <section className="section-wrap combo-blog-section"><div className="section-heading"><div><p className="section-label">CẨM NANG HÀNH TRÌNH</p><h2>Bài viết liên quan.</h2></div><Link className="text-link" href="/blog">Xem tất cả bài viết <ArrowRight size={16} /></Link></div><div className="blog-grid">{relatedPosts.map((post) => <BlogCard key={post.id} post={post} />)}</div></section>}

      <section className="vehicle-type-cta combo-final-cta"><div><p className="section-label">SẴN SÀNG LÊN ĐƯỜNG?</p><h2>Đặt xe {category.label.toLowerCase()} đi {route.to}.</h2><p>Chỉ cần để lại họ tên và số điện thoại, Xe Miền Nam sẽ gọi xác nhận.</p></div><a className="button button-primary" href="tel:19006789">Gọi 1900 6789 <Phone size={16} /></a></section>
      <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
    </main>
  );
}

export default ComboLandingPage;
