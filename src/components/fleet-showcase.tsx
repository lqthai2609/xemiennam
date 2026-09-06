"use client";

import { useState } from "react";
import { ArrowRight, Bus, BusFront, Car, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { vehicleTypeSlug } from "@/types/route";

const fleetTabs = ["Tất cả", "Đi một mình", "Đi cùng nhóm", "Thuê riêng"] as const;

// 4 nhóm khớp đúng taxonomy vehicle_type trong kiến trúc dữ liệu (mục 3, xemiennam-kien-truc-ky-thuat.md).
// Đây là 4 THẺ LOẠI XE tĩnh (không phải danh sách xe cụ thể từ CPT vehicle) nên không cần fetch —
// danh sách xe cụ thể theo từng loại nằm ở /doi-xe (đã nối fetchVehicles() thật).
const fleet: {
  type: string;
  tag: string;
  detail: string;
  accent: "sand" | "gold" | "navy" | "orange";
  icon: LucideIcon;
  tabs: (typeof fleetTabs)[number][];
}[] = [
  { type: "4–7 chỗ", tag: "Tự lái / có tài xế", detail: "Gia đình, cặp đôi, công tác. Tự lái hoặc có tài xế.", accent: "sand", icon: Car, tabs: ["Đi một mình"] },
  { type: "16–29 chỗ", tag: "Đi theo lịch trình", detail: "Nhóm bạn, công ty, đoàn nhỏ đi theo lịch trình.", accent: "gold", icon: Bus, tabs: ["Đi cùng nhóm"] },
  { type: "45 chỗ", tag: "Đoàn lớn", detail: "Đoàn lớn, công ty, trường học cho chuyến đi xa.", accent: "navy", icon: BusFront, tabs: ["Đi cùng nhóm"] },
  { type: "Limousine", tag: "Ghế nằm massage", detail: "Cabin rộng, ghế nằm massage — phù hợp tuyến dài.", accent: "orange", icon: Sparkles, tabs: ["Thuê riêng"] },
];

export function FleetShowcase() {
  const [activeTab, setActiveTab] = useState<(typeof fleetTabs)[number]>("Tất cả");

  return (
    <section className="fleet-section section-wrap" id="fleet">
      <div className="section-heading">
        <div>
          <p className="section-label">ĐỘI XE</p>
          <h2>Chọn xe theo số người, không theo số ghế trống.</h2>
        </div>
        <p className="heading-note">
          Từ xe con tự lái đến xe
          <br />
          giường nằm limousine.
        </p>
      </div>
      <div className="fleet-tabs">
        {fleetTabs.map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
      <div className="fleet-grid">
        {fleet
          .filter((item) => activeTab === "Tất cả" || item.tabs.includes(activeTab))
          .map((item) => (
            <article className={`fleet-card ${item.accent}`} key={item.type}>
              <div className="fleet-image">
                <item.icon size={56} strokeWidth={1.3} />
                <span className="fleet-sticker">{item.tag}</span>
              </div>
              <div className="fleet-info">
                <span className="fleet-kicker">XE MIỀN NAM</span>
                <h3>{item.type}</h3>
                <p>{item.detail}</p>
                {/* Trỏ sang trang riêng của loại xe (Ngày 13), dùng đúng vehicleTypeSlug() —
                    slug quy ước duy nhất, khớp với link đã có sẵn từ route-detail.tsx (Ngày 10). */}
                <Link href={`/loai-xe/${vehicleTypeSlug(item.type)}`}>
                  Xem chi tiết <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
