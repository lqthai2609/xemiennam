"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { VehicleFilter } from "@/components/vehicle-filter";
import { VehicleResults } from "@/components/vehicle-results";
import { emptyVehicleFilters, matchesVehicleFilters, type VehicleFilters, type Vehicle } from "@/types/vehicle";
import { navItems } from "@/data/nav";

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

/** Nhận `vehicles` qua props — dữ liệu đã được fetchVehicles() lấy từ WP REST API (Ngày 12) ở Server Component cha. */
export function FleetPageClient({ vehicles }: { vehicles: Vehicle[] }) {
  const [filters, setFilters] = useState<VehicleFilters>(emptyVehicleFilters);
  const filtered = useMemo(
    () => vehicles.filter((vehicle) => matchesVehicleFilters(vehicle, filters)),
    [filters, vehicles],
  );

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Thuê xe ngay" ctaHref="/#booking" />
      <section className="fleet-hero">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> THUÊ XE NGUYÊN CHIẾC
          </p>
          <h1>
            Chiếc xe đúng.
            <br />
            <em>Hành trình trọn vẹn.</em>
          </h1>
          <p>Xe riêng cho chuyến đi gia đình, đoàn công ty và mọi lịch trình cần sự chủ động.</p>
        </div>
        <div className="fleet-hero-note">
          <strong>{String(vehicles.length).padStart(2, "0")}</strong>
          <span>
            MẪU XE
            <br />
            SẴN SÀNG
          </span>
        </div>
      </section>
      <section className="section-wrap fleet-page-content">
        <VehicleFilter filters={filters} resultCount={filtered.length} onFilterChange={setFilters} />
        <div className="route-results-heading">
          <p className="section-label">DANH SÁCH XE</p>
          <Link className="text-link" href="/#booking">
            Gửi lịch trình <ArrowRight size={17} />
          </Link>
        </div>
        <VehicleResults vehicles={filtered} onClearFilters={() => setFilters(emptyVehicleFilters)} />
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
