"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { VEHICLE_TYPE_ORDER } from "@/lib/api/routes";
import { routeHref, routeComboHref, vehicleTypeSlug, type Route, type VehiclePrice } from "@/types/route";
import { formatVNDate } from "@/lib/wp";
import { UnifiedHero } from "@/components/unified-hero";
import { PriceExplanation } from "@/components/price-explanation";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Cẩm nang đi đường", href: "/blog" },
    ],
  },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/lien-he" }] },
];

function buildColumns(routes: Route[]): string[] {
  const present = new Set(routes.flatMap((route) => route.vehicleTypes));
  return VEHICLE_TYPE_ORDER.filter((type) => present.has(type));
}

/**
 * Ngày 7: pricingByVehicle là compatibility adapter đã derive từ outbound Pricing V2.
 * Giữ nguyên layout bảng, nhưng đọc mode/package tường minh để contact không bị hiểu là giá số.
 */
function pricingFor(route: Route, vehicleType: string): VehiclePrice | null {
  return route.pricingByVehicle.find((p) => p.vehicleType === vehicleType) ?? null;
}

function pricingLabel(pricing: VehiclePrice): string {
  return pricing.pricingMode === "contact" ? "Liên hệ" : pricing.price;
}

export function BangGiaPageClient({ routes, lastModified }: { routes: Route[]; lastModified?: string }) {
  const [query, setQuery] = useState("");
  const columns = useMemo(() => buildColumns(routes), [routes]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter((route) => `${route.from} ${route.to}`.toLowerCase().includes(q));
  }, [routes, query]);

  return (
    <main className="site-shell">
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="/#booking"
      />

      <UnifiedHero eyebrow="BẢNG GIÁ" title={<>Giá rõ ràng.<br /><em>chuyến đi nhẹ tênh.</em></>} description="Tham khảo nhanh mức giá thuê xe nguyên chiếc theo tuyến và loại xe." />

      <section className="section-wrap bang-gia-content">
        <div className="mb-6">
          <PriceExplanation compact />
        </div>
        <div className="bang-gia-toolbar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên tuyến, ví dụ: Vũng Tàu"
            aria-label="Tìm tuyến"
          />
          <p className="route-count">
            <strong>{filteredRoutes.length}</strong> tuyến
          </p>
        </div>

        <div className="bang-gia-table-wrap">
          <table className="bang-gia-table">
            <thead>
              <tr>
                <th scope="col">Tuyến</th>
                {columns.map((type) => (
                  <th scope="col" key={type}>
                    <Link href={`/loai-xe/${vehicleTypeSlug(type)}`}>{type}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => (
                <tr key={route.slug}>
                  <td>
                    <Link href={routeHref(route)} className="bang-gia-route-link">
                      {route.from} → {route.to}
                    </Link>
                  </td>
                  {columns.map((type) => {
                    const pricing = pricingFor(route, type);
                    return (
                      <td key={type}>
                        {pricing ? (
                          <Link
                            href={routeComboHref(route, vehicleTypeSlug(type))}
                            title={pricing.packageLabel ? `Gói đại diện: ${pricing.packageLabel}` : undefined}
                          >
                            {pricingLabel(pricing)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bang-gia-mobile-list">
          {filteredRoutes.map((route) => (
            <article className="bang-gia-mobile-card" key={route.slug}>
              <Link href={routeHref(route)} className="bang-gia-mobile-route">
                {route.from} → {route.to}
              </Link>
              <div className="bang-gia-mobile-prices">
                {columns.map((type) => {
                  const pricing = pricingFor(route, type);
                  if (!pricing) return null;
                  return (
                    <Link
                      key={type}
                      href={routeComboHref(route, vehicleTypeSlug(type))}
                      className="bang-gia-mobile-price-row"
                      title={pricing.packageLabel ? `Gói đại diện: ${pricing.packageLabel}` : undefined}
                    >
                      <span>{type}</span>
                      <strong>{pricingLabel(pricing)}</strong>
                    </Link>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        {filteredRoutes.length === 0 && (
          <p className="bang-gia-empty">Không tìm thấy tuyến phù hợp.</p>
        )}

        <p className="bang-gia-note">
          Mỗi ô thể hiện gói đại diện của đúng tuyến và loại xe. Liên hệ hotline hoặc Zalo để
          xác nhận giá theo lịch và thông tin chuyến thực tế.
          {lastModified && <> Cập nhật lần cuối {formatVNDate(lastModified)}.</>}
        </p>
      </section>

      <SiteFooter
        tagline={
          <>
            Đi đâu cũng có {SITE_NAME}.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
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
