"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { RouteFilter } from "@/components/route-filter";
import { RouteResults } from "@/components/route-results";
import { emptyFilters, FilterState } from "@/types/route";
import { routes } from "@/data/routes";
import { navItems } from "@/data/nav";

const footerLinkGroups = [{ title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Đội xe", href: "/doi-xe" }, { label: "Cẩm nang đi đường", href: "/#blog" }] }, { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "#" }, { label: "Chính sách huỷ chuyến", href: "#" }, { label: "Liên hệ", href: "/#booking" }] }];

export default function RoutesPage() {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const filteredRoutes = useMemo(() => routes.filter((route) => (!filters.region || route.region === filters.region) && (!filters.vehicleType || route.vehicleTypes.includes(filters.vehicleType)) && (!filters.seats || route.seatCount.includes(filters.seats))), [filters]);
  const regions = [...new Set(routes.map((route) => route.region))];
  const vehicleTypes = [...new Set(routes.flatMap((route) => route.vehicleTypes))];
  const seatOptions = ["4–7 chỗ", "16–29 chỗ", "45 chỗ"];

  return <main className="site-shell"><SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />
    <section className="routes-hero"><div><p className="eyebrow"><span className="eyebrow-line" /> MỞ RỘNG HÀNH TRÌNH</p><h1>Tuyến đường<br /><em>đáng để đi.</em></h1><p>Chọn điểm đến, loại xe và số chỗ phù hợp. Chúng tôi lo phần còn lại của hành trình.</p></div><div className="routes-hero-sign"><span>XE MIỀN NAM</span><strong>ĐI TỬ TẾ</strong><small>HƠN 15 TUYẾN CỐ ĐỊNH</small></div></section>
    <section className="section-wrap routes-page-content"><RouteFilter regions={regions} vehicleTypes={vehicleTypes} seatOptions={seatOptions} filters={filters} resultCount={filteredRoutes.length} onFilterChange={setFilters} /><div className="route-results-heading"><p className="section-label">DANH SÁCH TUYẾN</p><Link className="text-link" href="/#booking">Đặt chuyến ngay <ArrowRight size={17} /></Link></div><RouteResults routes={filteredRoutes} onClearFilters={() => setFilters(emptyFilters)} /></section>
    <SiteFooter tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>} phone="1900 6789" linkGroups={footerLinkGroups} socialLinks={defaultSocialLinks} copyright="© 2026 Xe Miền Nam" madeFor="Made for the road." />
  </main>;
}
