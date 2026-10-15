import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CarFront, Luggage, Phone, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { VehicleJourneyPicker } from "@/components/vehicle-journey-picker";
import { VehicleRealGallery } from "@/components/vehicle-real-gallery";
import { VehicleFactsSummary } from "@/components/vehicle-facts-summary";
import { PriceExplanation } from "@/components/price-explanation";
import { ServiceSteps } from "@/components/service-design-shared";
import { BlogCard } from "@/components/blog-card";
import { PromotionPrice } from "@/components/promotion-price";
import { navItems } from "@/data/nav";
import { vehicleFactsDisplay } from "@/lib/vehicle-facts-display";
import { formatPublicLocationText } from "@/lib/public-location-label";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_HOTLINE, SITE_HOTLINE_TEL } from "@/lib/site-config";
import type { VehicleCategory } from "@/types/vehicle-category";
import type { Vehicle } from "@/types/vehicle";
import type { Route } from "@/types/route";
import type { BlogPost } from "@/types/blog";
import type { VehicleCategoryRoutePrice } from "@/lib/vehicle-category-pricing";

function VehiclePageActions() {
  return <div className="vehicle-page-actions"><a className="home-button home-button-primary" href="#vehicle-journey">Xem giá chuyến đi <ArrowRight size={17} /></a><a className="home-button home-button-outline" href={"tel:" + SITE_HOTLINE_TEL}><Phone size={17} /> Gọi tư vấn</a></div>;
}

/** One template for every registered category; all vehicle facts remain per model. */
export function VehicleTypeDetailRedesign({ category, vehicles, routePrices, routes, relatedPosts, otherCategories }: {
  category: VehicleCategory; vehicles: Vehicle[]; routePrices: VehicleCategoryRoutePrice[];
  routes: Route[]; relatedPosts: BlogPost[]; otherCategories: VehicleCategory[];
}) {
  const photos = Array.from(new Set(vehicles.flatMap((vehicle) => vehicle.images)));
  const heroImage = photos[0];
  const confirmed = vehicles.filter((vehicle) => vehicle.operationalFacts?.status === "confirmed");
  const confirmedCapacity = confirmed.filter((vehicle) => vehicle.operationalFacts?.facts?.passenger_capacity != null);
  const vehicleTitle = "Xe " + category.type;
  return <main className="site-shell home-redesign vehicle-page">
    <SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={"tel:" + SITE_HOTLINE_TEL} ctaLabel="Nhắn Zalo" ctaHref={getZaloChatLink()} homeDesign />
    <div className="vehicle-page-width">
      <PublicBreadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Loại xe", href: "/loai-xe" }, { label: vehicleTitle }]} />
      <section className="vehicle-page-hero" aria-labelledby="vehicle-page-title">
        <div><p className="home-eyebrow">XE RIÊNG CHO HÀNH TRÌNH CỦA BẠN</p><h1 id="vehicle-page-title">Thuê xe {category.type} có tài xế</h1></div>
        <div className="vehicle-page-hero-media">{heroImage ? <Image src={heroImage} alt={"Ảnh tham khảo " + vehicleTitle.toLowerCase()} fill sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1208px) calc(100vw - 48px), 1160px" preload /> : <div className="vehicle-page-no-photo"><CarFront size={64} /><span>Ảnh xe cần được xác nhận</span></div>}</div>
        <div><p className="vehicle-page-lead">{category.description}</p>
          {confirmedCapacity.length > 0 && <div className="vehicle-page-confirmed">{confirmedCapacity.map((vehicle) => <span key={vehicle.id}><UsersRound size={16} />{vehicle.name}: {vehicleFactsDisplay(vehicle).passengers}</span>)}</div>}
          <VehiclePageActions />
          <p className="vehicle-page-caption">Mẫu xe thực tế và lịch phục vụ được xác nhận khi tư vấn.</p>
        </div>
      </section>
      <VehicleJourneyPicker vehicleType={category.type} vehicleSlug={category.slug} routes={routes} />
      <section className="vehicle-page-section" id="vehicle-capacity" aria-labelledby="vehicle-capacity-title">
        <header className="vehicle-page-section-heading"><p className="home-eyebrow">CHỌN XE THEO NHU CẦU THỰC TẾ</p><h2 id="vehicle-capacity-title">{vehicleTitle} có phù hợp với chuyến đi?</h2><p>Sức chứa và hành lý được xác nhận theo từng cấu hình xe.</p></header>
        <div className="vehicle-page-fit-grid"><article><UsersRound size={24} /><h3>Số hành khách</h3><p>{confirmedCapacity.length ? "Số hành khách đã xác nhận không gồm tài xế." : "Cần tư vấn. Hãy trao đổi số khách của đoàn để xác nhận xe phù hợp."}</p>{confirmedCapacity.length > 0 && <ul>{confirmedCapacity.map((vehicle) => <li key={vehicle.id}>{vehicle.name}: {vehicleFactsDisplay(vehicle).passengers}</li>)}</ul>}</article><article><Luggage size={24} /><h3>Hành lý của đoàn</h3><p>{confirmed.some((vehicle) => vehicleFactsDisplay(vehicle).loadProfiles.length) ? "Đối chiếu số khách, số kiện và kích thước trong cùng cấu hình đã xác nhận." : "Cần tư vấn. Hãy cung cấp số kiện và kích thước để được xác nhận theo mẫu xe."}</p></article><article><CarFront size={24} /><h3>Nhu cầu phù hợp</h3><ul>{category.audience.map((item) => <li key={item}>{item}</li>)}</ul><p>Cấu hình cụ thể vẫn cần được đối chiếu với đoàn và hành trình.</p></article></div>
        <div className="vehicle-page-notice"><strong>Khi nào nên cân nhắc loại xe khác?</strong><p>Khi số khách vượt sức chứa đã xác nhận, hoặc cấu hình hành lý chưa đáp ứng nhu cầu, hãy xem thêm lựa chọn và trao đổi với tư vấn viên.</p><div className="vehicle-page-comparison-links">{otherCategories.map((item) => <Link key={item.slug} href={"/loai-xe/" + item.slug}>Xe {item.type} <ArrowRight size={14} /></Link>)}</div></div>
      </section>
      <section className="vehicle-page-section" aria-labelledby="vehicle-models-title"><header className="vehicle-page-section-heading"><p className="home-eyebrow">XE VÀ HÌNH ẢNH</p><h2 id="vehicle-models-title">Mẫu xe {category.type} tham khảo</h2><p>Ảnh từ thư viện xe thuộc đúng loại đang xem. Xe giao thực tế và lịch xe được xác nhận khi tư vấn.</p></header>
        {vehicles.length ? <div className="vehicle-page-models">{vehicles.map((vehicle) => <article key={vehicle.id} className="vehicle-page-model"><h3>{formatPublicLocationText(vehicle.name)}</h3>{vehicle.description && <p>{formatPublicLocationText(vehicle.description)}</p>}<VehicleFactsSummary facts={vehicleFactsDisplay(vehicle)} />{vehicle.images.length > 0 ? <VehicleRealGallery images={vehicle.images} /> : <p className="vehicle-page-caption">Ảnh mẫu xe: Cần tư vấn.</p>}</article>)}</div> : <p className="vehicle-page-notice">Chưa có mẫu xe được công bố cho loại này. Cần tư vấn.</p>}
      </section>
      <section className="vehicle-page-section" id="vehicle-detail-routes" aria-labelledby="vehicle-routes-title"><header className="vehicle-page-section-heading"><p className="home-eyebrow">GIÁ THEO HÀNH TRÌNH</p><h2 id="vehicle-routes-title">Một số tuyến bằng xe {category.type}</h2><p>Mỗi giá gắn với đúng chiều đi và gói dịch vụ. Chọn hành trình phía trên để xem đầy đủ.</p></header>
        {routePrices.length ? <div className="vehicle-page-route-table">{routePrices.slice(0, 9).map((row) => <article key={row.href + ":" + row.vehicleId}><div><h3>{row.route}</h3><p>{row.packageLabel} · Xe {category.type}</p></div><div>{row.promotionView ? <PromotionPrice view={row.promotionView} /> : <strong>{row.price}</strong>}<small>Giá theo gói đang hiển thị</small></div><Link className="home-button home-button-outline" href={row.href}>Xem tuyến <ArrowRight size={16} /></Link></article>)}</div> : <p className="vehicle-page-notice">Chưa có giá phù hợp cho xe {category.type}. <Link href="/lien-he">Gửi nhu cầu để nhận báo giá</Link>.</p>}
      </section>
      <section className="vehicle-page-section" aria-labelledby="vehicle-cost-title"><header className="vehicle-page-section-heading"><h2 id="vehicle-cost-title">Chi phí và điều kiện chuyến đi</h2><p>Các khoản bao gồm, chưa bao gồm và điều kiện phát sinh cần được xác nhận theo đúng hành trình, xe và gói bạn chọn.</p></header><PriceExplanation compact /><p className="vehicle-page-caption">Điều kiện từ dữ liệu tuyến được đặt cạnh kết quả giá khi chọn hành trình. Các khoản chi phí và điều kiện riêng được xác nhận theo lịch thực tế.</p></section>
      <section className="vehicle-page-section" aria-labelledby="vehicle-process-title"><header className="vehicle-page-section-heading"><h2 id="vehicle-process-title">Tiếp tục đặt chuyến cùng Alo Đặt Xe</h2><p>Chọn hành trình, gửi lịch trình và nhận xác nhận xe, giá theo quy trình hiện hành.</p></header><ServiceSteps /><p className="vehicle-page-caption">Liên hệ tư vấn: <a href={"tel:" + SITE_HOTLINE_TEL}>{SITE_HOTLINE}</a>. Mẫu xe và chi phí cuối cùng được xác nhận trước khi nhận chuyến.</p></section>
      {relatedPosts.length > 0 && <section className="vehicle-page-section"><header className="vehicle-page-section-heading"><h2>Thông tin liên quan đến xe {category.type}</h2></header><div className="vehicle-page-article-grid">{relatedPosts.map((post) => <BlogCard key={post.slug} post={post} />)}</div></section>}
      <section className="vehicle-page-section vehicle-page-faq" id="vehicle-detail-faq" aria-labelledby="vehicle-faq-title"><header className="vehicle-page-section-heading"><h2>Câu hỏi thường gặp</h2></header>
        <details><summary>Xe {category.type} phục vụ được bao nhiêu hành khách?</summary><p>{confirmedCapacity.length ? "Sức chứa không gồm tài xế được ghi riêng trong hồ sơ từng mẫu xe ở phần trên." : "Cần tư vấn. Hãy cung cấp số khách của đoàn để xác nhận sức chứa theo mẫu xe thực tế."}</p></details>
        <details><summary>Đoàn của tôi có nhiều hành lý thì nên chọn thế nào?</summary><p>{confirmed.some((vehicle) => vehicleFactsDisplay(vehicle).loadProfiles.length) ? "Đối chiếu cùng một cấu hình số khách và hành lý của mẫu xe; không cộng các mức tối đa từ những cấu hình khác nhau." : "Cần tư vấn. Hãy cung cấp số khách, số kiện và kích thước hành lý để xác nhận mẫu xe phù hợp."}</p></details>
        <details><summary>Giá có đúng chiều đi và gói đang chọn không?</summary><p>Giá hiển thị theo hành trình, chiều, loại xe và gói bạn chọn. Bạn có thể xem thêm điều kiện tại trang tuyến trước khi tiếp tục đặt chuyến.</p></details>
        <details><summary>Tôi tiếp tục đặt xe như thế nào?</summary><p>Chọn hành trình và gói được phục vụ, nhập điểm đón trả, lịch đi, sau đó dùng nút gửi yêu cầu để tiếp tục form đặt xe hiện hành. Lịch xe và chi phí được xác nhận trước chuyến.</p></details>
      </section>
      <section className="vehicle-page-final"><div><p className="home-eyebrow">SẴN SÀNG CHỌN HÀNH TRÌNH</p><h2>Trao đổi chuyến đi bằng xe {category.type}</h2><p>Xem giá theo lịch trình hoặc gọi để xác nhận xe phù hợp với đoàn.</p></div><VehiclePageActions /></section>
    </div>
    <SiteFooter />
  </main>;
}
