"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { VEHICLE_TYPE_ORDER } from "@/lib/api/routes";
import { vehicleTypeSlug, type Route } from "@/types/route";

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Đội xe", href: "/doi-xe" },
      { label: "Cẩm nang đi đường", href: "/#blog" },
    ],
  },
  { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Liên hệ", href: "/#booking" }] },
];

/** Chỉ giữ lại các loại xe thực sự xuất hiện ở ít nhất 1 tuyến, theo đúng thứ tự VEHICLE_TYPE_ORDER. */
function buildColumns(routes: Route[]): string[] {
  const present = new Set(routes.flatMap((route) => route.vehicleTypes));
  return VEHICLE_TYPE_ORDER.filter((type) => present.has(type));
}

function priceFor(route: Route, vehicleType: string): string | null {
  return route.pricingByVehicle.find((p) => p.vehicleType === vehicleType)?.price ?? null;
}

/** Nhận `routes` qua props — dữ liệu đã được fetchRoutes() lấy từ WP REST API (Ngày 12) ở Server Component cha. */
export function BangGiaPageClient({ routes }: { routes: Route[] }) {
  const [query, setQuery] = useState("");
  const columns = useMemo(() => buildColumns(routes), [routes]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter((route) => `${route.from} ${route.to}`.toLowerCase().includes(q));
  }, [routes, query]);

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="bang-gia-hero">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> BẢNG GIÁ
          </p>
          <h1>
            Giá thuê xe
            <br />
            <em>theo từng tuyến.</em>
          </h1>
          <p>
            Thuê nguyên chiếc, chủ động giờ giấc. Giá dưới đây là giá tham khảo — liên hệ để
            được báo giá chính xác cho hành trình của bạn.
          </p>
        </div>
        <div className="bang-gia-hero-note">
          <strong>{String(routes.length).padStart(2, "0")}</strong>
          <span>
            TUYẾN
            <br />
            ĐANG CHẠY
          </span>
        </div>
      </section>

      <section className="section-wrap bang-gia-content">
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
                    <Link href={`/tuyen-duong/${route.slug}`} className="bang-gia-route-link">
                      {route.from} → {route.to}
                    </Link>
                  </td>
                  {columns.map((type) => {
                    const price = priceFor(route, type);
                    return (
                      <td key={type}>
                        {price ? (
                          <Link href={`/tuyen-duong/${route.slug}/${vehicleTypeSlug(type)}`}>{price}</Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredRoutes.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="bang-gia-empty">
                    Không tìm thấy tuyến phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="bang-gia-note">
          Giá tham khảo, có thể thay đổi theo mùa hoặc dịp lễ. Liên hệ hotline hoặc Zalo để
          được báo giá chính xác cho chuyến đi của bạn.
        </p>
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
