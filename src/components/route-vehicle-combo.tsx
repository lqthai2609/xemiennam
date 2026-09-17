"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CarFront, Clock3, MessageCircle, Phone, ShieldCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { BlogCard } from "@/components/blog-card";
import { MediaPhoto } from "@/components/media-photo";
import { RouteBookingActions, type AirportBookingContext } from "@/components/route-booking-actions";
import {
  comboDescriptionOrDefault,
  findComboVehiclePrice,
  findComboVehiclePriceForDirection,
} from "@/lib/combo";
import {
  routeHref,
  routeComboHref,
  type Route,
  type RoutePricingDirectionKey,
  type VehiclePrice,
} from "@/types/route";
import type { VehicleCategory } from "@/types/vehicle-category";
import type { Vehicle } from "@/types/vehicle";
import type { BlogPost } from "@/types/blog";
import { UnifiedHero } from "@/components/unified-hero";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

const footerLinkGroups = [
  { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Cẩm nang đi đường", href: "/blog" }] },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

function SimilarRouteCard({ route, vehicleSlug }: { route: Route; vehicleSlug: string }) {
  const vehiclePrice = findComboVehiclePrice(route, vehicleSlug);
  const priceLabel = vehiclePrice?.pricingMode === "contact" ? "Liên hệ báo giá" : vehiclePrice?.price || "Liên hệ báo giá";

  return (
    <Link className="combo-similar-card" href={routeComboHref(route, vehicleSlug)}>
      <span>{route.from} → {route.to}</span>
      <strong>{priceLabel}</strong>
      <small><Clock3 size={13} /> {route.time}</small>
      <ArrowRight size={17} />
    </Link>
  );
}

export function ComboLandingPage({ route, vehiclePrice, category, similarRoutes, relatedPosts, vehicle }: {
  route: Route;
  vehiclePrice: VehiclePrice;
  category: VehicleCategory;
  similarRoutes: Route[];
  relatedPosts: BlogPost[];
  vehicle?: Vehicle;
}) {
  const [direction, setDirection] = useState<RoutePricingDirectionKey>("outbound");

  useEffect(() => {
    const requestedDirection = new URLSearchParams(window.location.search).get("direction");
    if (requestedDirection !== "inbound") return;
    if (!findComboVehiclePriceForDirection(route, category.slug, "inbound")) return;

    // Giữ page/metadata canonical outbound và chỉ đồng bộ chiều tìm kiếm sau hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDirection("inbound");
  }, [category.slug, route]);

  const activeVehiclePrice = useMemo(
    () => findComboVehiclePriceForDirection(route, category.slug, direction) ?? vehiclePrice,
    [category.slug, direction, route, vehiclePrice],
  );
  const isInbound = direction === "inbound";
  const displayFrom = isInbound ? route.to : route.from;
  const displayTo = isInbound ? route.from : route.to;
  const description = comboDescriptionOrDefault(route, activeVehiclePrice);
  const routeLabel = `${route.from} – ${route.to}`;
  const displayRoute = `${displayFrom} – ${displayTo}`;
  const isContact = activeVehiclePrice.pricingMode === "contact";
  const hasValidFixedPrice =
    activeVehiclePrice.pricingMode === "fixed" &&
    typeof activeVehiclePrice.numericPrice === "number" &&
    activeVehiclePrice.numericPrice > 0;
  const image = vehicle?.images[0] || category.imageUrl;
  const heroImage = route.featuredImage || "/images/hero-dat-xe-sai-gon.webp";
  const pickupLocation = isInbound ? route.destinationLocation : route.originLocation;
  const dropoffLocation = isInbound ? route.originLocation : route.destinationLocation;
  const airportContext: AirportBookingContext | undefined =
    pickupLocation?.type === "airport"
      ? "pickup_from_airport"
      : dropoffLocation?.type === "airport"
        ? "dropoff_at_airport"
        : undefined;
  const airportName = airportContext === "pickup_from_airport"
    ? pickupLocation?.name
    : airportContext === "dropoff_at_airport"
      ? dropoffLocation?.name
      : undefined;
  const backHref = isInbound ? `${routeHref(route)}?direction=inbound` : routeHref(route);

  return (
    <main className="site-shell combo-page">
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="#booking"
      />
      <UnifiedHero
        eyebrow={`${route.region} · ${category.label}`}
        title={<>Thuê xe {category.label.toLowerCase()}<br /><em>{displayFrom} → {displayTo}</em></>}
        description={description}
        backgroundImage={heroImage}
        backHref={backHref}
        backLabel={`Tuyến ${displayRoute}`}
      />
      <section className="section-wrap combo-booking-section" id="booking">
        <div className="section-heading">
          <div>
            <p className="section-label">XE PHÙ HỢP CHO HÀNH TRÌNH</p>
            <h2>Chọn xe, đặt chuyến ngay.</h2>
          </div>
          <p className="heading-note">Giá và điều kiện chuyến được xác nhận trước khi khởi hành.</p>
        </div>
        <article className="combo-vehicle-card">
          <div className="combo-vehicle-media">
            {image ? <MediaPhoto src={image} alt={vehicle?.name || category.label} /> : <CarFront size={76} strokeWidth={1.2} />}
            <strong>Xe {activeVehiclePrice.vehicleType}</strong>
          </div>
          <div className="combo-vehicle-info">
            <div className="combo-vehicle-top">
              <div><h2>{vehicle?.name || `Xe ${activeVehiclePrice.vehicleType}`}</h2></div>
              <div className="combo-price">
                <strong>{isContact ? "Liên hệ báo giá" : hasValidFixedPrice ? activeVehiclePrice.price : "Liên hệ báo giá"}</strong>
                {activeVehiclePrice.packageLabel && <small>{activeVehiclePrice.packageLabel}</small>}
              </div>
            </div>
            <div className="combo-vehicle-divider" />
            {vehicle?.seats && (
              <div className="combo-vehicle-details">
                <p><Users size={17} /> {vehicle.seats}</p>
              </div>
            )}
            <div className="combo-vehicle-actions">
              <div>
                <p className="combo-alert">
                  {isContact || !hasValidFixedPrice
                    ? "Liên hệ để xác nhận giá theo lịch thực tế"
                    : "Giá và điều kiện chuyến được xác nhận trước khi khởi hành."}
                </p>
              </div>
              <RouteBookingActions
                route={routeLabel}
                routeId={route.id}
                displayRoute={displayRoute}
                vehicleType={activeVehiclePrice.vehicleType}
                price={hasValidFixedPrice ? activeVehiclePrice.price : undefined}
                direction={direction}
                packageKey={activeVehiclePrice.packageKey}
                packageLabel={activeVehiclePrice.packageLabel}
                pricingMode={isContact || !hasValidFixedPrice ? "contact" : "fixed"}
                airportContext={airportContext}
                airportName={airportName}
              />
            </div>
          </div>
        </article>
      </section>

      <section className="section-wrap combo-benefits">
        <div className="section-heading">
          <div>
            <p className="section-label">THÔNG TIN HÀNH TRÌNH</p>
            <h2>Một chuyến đi nhẹ tênh.</h2>
          </div>
        </div>
        <div className="combo-benefit-grid">
          <div><ShieldCheck size={22} /><strong>Thông tin rõ ràng</strong><p>Nhân viên xác nhận giá và điều kiện chuyến trước khi khởi hành.</p></div>
          <div><Clock3 size={22} /><strong>Đón tận nơi</strong><p>Linh hoạt điểm đón tại {displayFrom} và trả khách tại {displayTo}.</p></div>
          <div><MessageCircle size={22} /><strong>Hỗ trợ nhanh</strong><p>Luôn có đội ngũ hỗ trợ qua điện thoại và Zalo.</p></div>
        </div>
      </section>

      {similarRoutes.length > 0 && (
        <section className="section-wrap combo-similar-section">
          <div className="section-heading">
            <div><p className="section-label">CÙNG TỈNH {route.region.toUpperCase()}</p><h2>Các tuyến tương tự.</h2></div>
            <Link className="text-link" href={`/tuyen-duong/${route.regionSlug}`}>Xem tất cả tuyến <ArrowRight size={16} /></Link>
          </div>
          <div className="combo-similar-grid">
            {similarRoutes.map((item) => <SimilarRouteCard key={item.id} route={item} vehicleSlug={category.slug} />)}
          </div>
        </section>
      )}

      {relatedPosts.length > 0 && (
        <section className="section-wrap combo-blog-section">
          <div className="section-heading">
            <div><p className="section-label">CẨM NANG HÀNH TRÌNH</p><h2>Bài viết liên quan.</h2></div>
            <Link className="text-link" href="/blog">Xem tất cả bài viết <ArrowRight size={16} /></Link>
          </div>
          <div className="blog-grid">{relatedPosts.map((post) => <BlogCard key={post.id} post={post} />)}</div>
        </section>
      )}

      <section className="vehicle-type-cta combo-final-cta">
        <div>
          <p className="section-label">SẴN SÀNG LÊN ĐƯỜNG?</p>
          <h2>Đặt xe {category.label.toLowerCase()} đi {displayTo}.</h2>
          <p>Nhân viên {SITE_NAME} sẽ xác nhận giá và điều kiện chuyến trước khi hoàn tất đặt xe.</p>
        </div>
        <a className="button button-primary" href={`tel:${SITE_HOTLINE_TEL}`} aria-label={`Gọi ${SITE_HOTLINE}`}>
          Gọi {SITE_HOTLINE} <Phone size={16} />
        </a>
      </section>
      <SiteFooter
        tagline={<>Đi đâu cũng có {SITE_NAME}.<br />Kết nối những hành trình tử tế.</>}
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}`}
        madeFor="Made for the road."
        brandName={SITE_NAME}
      />
    </main>
  );
}

export default ComboLandingPage;
