"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { RouteResults } from "@/components/route-results";
import { RouteFinderForm } from "@/components/route-finder-form";
import { emptyFilters, type FilterState, type Route } from "@/types/route";
import { navItems } from "@/data/nav";
import { buildRouteFinderProvinces } from "@/lib/route-finder";

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
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Chính sách huỷ chuyến", href: "#" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

/** Nhận `routes` qua props — dữ liệu đã được fetchRoutes() lấy từ WP REST API (Ngày 12) ở Server Component cha. */
export function RoutesPageClient({ routes }: { routes: Route[] }) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  // Đến từ ô "Tìm chuyến" ở trang chủ (booking-bar) hoặc form "Tìm tuyến phù hợp" (route-finder-form)
  // với ?diem_den=<tỉnh>&khu_vuc=<khu vực>&loai_xe=<loại xe> — tự chọn sẵn bộ lọc tương ứng. Đọc
  // trực tiếp window.location thay vì useSearchParams() để không bắt buộc bọc Suspense quanh trang này.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const diemDen = params.get("diem_den");
    const khuVuc = params.get("khu_vuc");
    const loaiXe = params.get("loai_xe");
    if (diemDen || khuVuc || loaiXe) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters((current) => ({
        ...current,
        region: diemDen ?? current.region,
        area: khuVuc ?? current.area,
        vehicleType: loaiXe ?? current.vehicleType,
      }));
    }
  }, []);

  const filteredRoutes = useMemo(
    () =>
      routes.filter(
        (route) =>
          (!filters.region || route.region === filters.region) &&
          (!filters.area || route.to === filters.area) &&
          (!filters.vehicleType || route.vehicleTypes.includes(filters.vehicleType)) &&
          (!filters.seats || route.seatCount.includes(filters.seats)),
      ),
    [filters, routes],
  );
  // Tính động từ route.seatCount thật (đã tự loại Limousine, xem lib/api/routes.ts) thay vì
  // liệt kê cứng — Ngày 25: liệt kê cứng từng làm dropdown "Số chỗ" lệch khi taxonomy đổi
  // từ 4 sang 6 loại, tính động thì luôn khớp bất kể sau này còn đổi tiếp.
  const finderProvinces = useMemo(() => buildRouteFinderProvinces(routes), [routes]);
  const [layout] = useState<"editorial" | "cards" | "compact">(() => {
    if (typeof window === "undefined") return "editorial";
    const variant = new URLSearchParams(window.location.search).get("variant");
    return variant === "2" ? "cards" : variant === "3" ? "compact" : "editorial";
  });
  const groupedRoutes = useMemo(() => {
    const groups = new Map<string, Route[]>();
    filteredRoutes.forEach((route) => groups.set(route.region, [...(groups.get(route.region) ?? []), route]));
    return [...groups.entries()];
  }, [filteredRoutes]);

  return (
    <main className={`site-shell routes-variant-${layout}`}>
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />
      <section className="routes-hero">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> MỞ RỘNG HÀNH TRÌNH
          </p>
          <h1>
            Tuyến đường
            <br />
            <em>đáng để đi.</em>
          </h1>
          <p>Chọn điểm đến, loại xe và số chỗ phù hợp. Chúng tôi lo phần còn lại của hành trình.</p>
        </div>
        <div className="routes-hero-sign">
          <span>XE MIỀN NAM</span>
          <strong>ĐI TỬ TẾ</strong>
          <small>HƠN 15 TUYẾN CỐ ĐỊNH</small>
        </div>
      </section>
      <RouteFinderForm provinces={finderProvinces} />
      <section className="section-wrap routes-page-content">
        <div className="routes-catalog-heading">
          <div>
            <p className="section-label">DANH SÁCH TUYẾN</p>
            <h2>Chọn điểm đến,<br /><em>chúng tôi lo đường đi.</em></h2>
          </div>
          <p className="routes-count"><strong>{filteredRoutes.length}</strong> tuyến đang phục vụ</p>
        </div>
        <div className="route-groups">
          {groupedRoutes.map(([region, regionRoutes]) => (
            <section className="route-region" key={region} aria-labelledby={`region-${region}`}>
              <div className="route-region-heading">
                <div><span className="route-region-dot" /><p className="section-label">ĐIỂM ĐẾN</p></div>
                <h2 id={`region-${region}`}>{region}</h2>
                <span>{regionRoutes.length} tuyến</span>
              </div>
              <RouteResults routes={regionRoutes} onClearFilters={() => setFilters(emptyFilters)} />
            </section>
          ))}
        </div>
        <section className="routes-cta" aria-labelledby="routes-cta-title">
          <div><p className="section-label">CHƯA BIẾT CHỌN TUYẾN NÀO?</p><h2 id="routes-cta-title">Nói điểm đến,<br /><em>để chúng tôi lo phần còn lại.</em></h2></div>
          <Link className="button button-primary" href="/#booking">Tìm chuyến phù hợp <ArrowRight size={16} /></Link>
        </section>
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
