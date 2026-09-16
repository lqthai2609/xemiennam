"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { RouteDestinationSearch } from "@/components/route-destination-search";
import { RouteResults } from "@/components/route-results";
import { SubpageHero, defaultSubpageHeroImage } from "@/components/subpage-hero";
import { emptyFilters, type FilterState, type Route } from "@/types/route";
import { navItems } from "@/data/nav";
import { locationMatchesQuery } from "@/lib/location-search";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

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

/**
 * Nhận `routes` qua props — dữ liệu đã được fetchRoutes() lấy từ WP REST API (Ngày 12) ở Server
 * Component cha. Bảng lọc thủ công (RouteFilter, có field "Số chỗ") đã bị bỏ khỏi trang này theo
 * yêu cầu — chỉ còn form "Tìm tuyến phù hợp" (RouteFinderForm) dưới hero. Vẫn giữ lại state
 * `filters`/`filteredRoutes` vì RouteFinderForm điều hướng tới đây kèm query param
 * (diem_den/khu_vuc/loai_xe) để lọc sẵn danh sách hiển thị bên dưới.
 */
export function RoutesPageClient({ routes }: { routes: Route[] }) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [destinationQuery, setDestinationQuery] = useState("");

  // Đến từ form "Tìm tuyến phù hợp" (route-finder-form) ở trang chủ, /tuyen-duong hoặc /diem-den
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
          (!filters.seats || route.seatCount.includes(filters.seats)) &&
          (!destinationQuery ||
            locationMatchesQuery(route.from, destinationQuery) ||
            locationMatchesQuery(route.to, destinationQuery) ||
            locationMatchesQuery(route.region, destinationQuery)),
      ),
    [destinationQuery, filters, routes],
  );

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
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="/#booking"
      />
      <SubpageHero
        title="Tuyến đường đáng để đi."
        description="Chọn điểm đến, loại xe và số chỗ phù hợp. Chúng tôi lo phần còn lại của hành trình."
        backgroundImage={defaultSubpageHeroImage}
        routes={routes}
      />
      <section className="section-wrap routes-page-content">
        <div className="routes-catalog-heading">
          <div>
            <p className="section-label">DANH SÁCH TUYẾN</p>
            <h2>Chọn điểm đến,<br /><em>chúng tôi lo đường đi.</em></h2>
          </div>
          <p className="routes-count"><strong>{filteredRoutes.length}</strong> tuyến đang phục vụ</p>
        </div>

        <RouteDestinationSearch
          routes={routes}
          value={destinationQuery}
          onChange={setDestinationQuery}
        />

        <div className="route-groups">
          {groupedRoutes.length > 0 ? (
            groupedRoutes.map(([region, regionRoutes]) => (
              <section className="route-region" key={region} aria-labelledby={`region-${region}`}>
                <div className="route-region-heading">
                  <div><span className="route-region-dot" /><p className="section-label">ĐIỂM ĐẾN</p></div>
                  <h2 id={`region-${region}`}>{region}</h2>
                  <span>{regionRoutes.length} tuyến</span>
                </div>
                <RouteResults routes={regionRoutes} onClearFilters={() => setFilters(emptyFilters)} />
              </section>
            ))
          ) : (
            <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center md:px-8 md:py-10" role="status">
              <p className="m-0 text-lg font-bold text-foreground">
                Chưa tìm thấy tuyến phù hợp{destinationQuery ? ` với “${destinationQuery}”` : ""}.
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Thử tìm tên tỉnh, thành phố hoặc điểm đến khác.
              </p>
              {destinationQuery ? (
                <button
                  type="button"
                  onClick={() => setDestinationQuery("")}
                  className="button button-primary mt-5"
                >
                  Xóa tìm kiếm
                </button>
              ) : null}
            </div>
          )}
        </div>
        <section className="routes-cta" aria-labelledby="routes-cta-title">
          <div><p className="section-label">CHƯA BIẾT CHỌN TUYẾN NÀO?</p><h2 id="routes-cta-title">Nói điểm đến,<br /><em>để chúng tôi lo phần còn lại.</em></h2></div>
          <Link className="button button-primary" href="/#booking">Tìm chuyến phù hợp <ArrowRight size={16} /></Link>
        </section>
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
