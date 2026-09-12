"use client";

import { useState } from "react";
import { ArrowRight, Bus, BusFront, Car, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { vehicleTypeSlug } from "@/types/route";
import { MediaPhoto } from "@/components/media-photo";
import { buildPlaceholderImage } from "@/lib/placeholder-image";

const fleetTabs = ["Tất cả", "Đi một mình", "Đi cùng nhóm", "Thuê riêng"] as const;

// 6 nhóm khớp đúng taxonomy vehicle_type trong kiến trúc dữ liệu (mục 3, xemiennam-kien-truc-ky-thuat.md) —
// Ngày 25: tách "4–7 chỗ" và "16–29 chỗ" cũ thành 4 loại riêng (4/7/16/29 chỗ), khớp
// data/vehicle-categories.ts (cùng slug, cùng màu accent).
// Đây là 6 THẺ LOẠI XE tĩnh (không phải danh sách xe cụ thể từ CPT vehicle) nên không cần fetch —
// danh sách xe cụ thể theo từng loại đã gộp vào /loai-xe/[slug] (đã nối fetchVehicles() thật).
// imageUrl hiện là ẢNH PLACEHOLDER TẠM (xem lib/placeholder-image.ts), không phải ảnh xe
// thật — bắt buộc thay bằng ảnh thật trước khi lên domain thật (Ngày 21b).
const fleet: {
  type: string;
  tag: string;
  detail: string;
  accent: "sand" | "gold" | "navy" | "orange";
  icon: LucideIcon;
  imageUrl: string;
  tabs: (typeof fleetTabs)[number][];
}[] = [
  { type: "4 chỗ", tag: "Tự lái / có tài xế", detail: "Gọn gàng, riêng tư cho cặp đôi, gia đình nhỏ hoặc khách công tác.", accent: "sand", icon: Car, imageUrl: buildPlaceholderImage("sand", "Ảnh xe 4 chỗ", { width: 480, height: 300 }), tabs: ["Đi một mình"] },
  { type: "7 chỗ", tag: "Tự lái / có tài xế", detail: "Rộng rãi cho gia đình có trẻ nhỏ hoặc nhóm bạn nhiều hành lý.", accent: "gold", icon: Car, imageUrl: buildPlaceholderImage("gold", "Ảnh xe 7 chỗ", { width: 480, height: 300 }), tabs: ["Đi cùng nhóm"] },
  { type: "16 chỗ", tag: "Đi theo lịch trình", detail: "Đoàn nhỏ, công ty, tour gia đình đi theo lịch trình.", accent: "navy", icon: Bus, imageUrl: buildPlaceholderImage("navy", "Ảnh xe 16 chỗ", { width: 480, height: 300 }), tabs: ["Đi cùng nhóm"] },
  { type: "29 chỗ", tag: "Đoàn vừa", detail: "Cân bằng giữa rộng rãi và linh hoạt cho tour, sự kiện, trường học.", accent: "orange", icon: Bus, imageUrl: buildPlaceholderImage("orange", "Ảnh xe 29 chỗ", { width: 480, height: 300 }), tabs: ["Đi cùng nhóm"] },
  { type: "45 chỗ", tag: "Đoàn lớn", detail: "Đoàn lớn, công ty, trường học cho chuyến đi xa.", accent: "navy", icon: BusFront, imageUrl: buildPlaceholderImage("navy", "Ảnh xe 45 chỗ", { width: 480, height: 300 }), tabs: ["Đi cùng nhóm"] },
  { type: "Limousine", tag: "Ghế nằm massage", detail: "Cabin rộng, ghế nằm massage — phù hợp tuyến dài.", accent: "orange", icon: Sparkles, imageUrl: buildPlaceholderImage("orange", "Ảnh Limousine", { width: 480, height: 300 }), tabs: ["Thuê riêng"] },
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
                {item.imageUrl ? (
                  <MediaPhoto
                    src={item.imageUrl}
                    alt={item.type}
                    sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"
                  />
                ) : <item.icon size={56} strokeWidth={1.3} />}
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
