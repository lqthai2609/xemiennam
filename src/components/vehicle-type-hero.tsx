import Link from "next/link";
import { ArrowRight, BusFront } from "lucide-react";
import { MediaPhoto } from "@/components/media-photo";
import type { VehicleCategory } from "@/types/vehicle-category";

/**
 * Hero trang chi tiết loại xe (Ngày 25e) — ảnh xe thật phủ kín chiều rộng hero + overlay
 * gradient tối từ trái sang, chữ đặt đè lên ảnh ở góc dưới trái. Thay cho bố cục 2 cột cũ
 * (ảnh nhỏ "vehicle-type-art" cạnh khối chữ) vì ảnh không đủ nổi bật. Chọn từ 3 phương án
 * v0 đưa ra (A: ảnh nền full-bleed / B: ảnh lớn nửa dưới / C: ảnh khung nổi) — đây là A.
 *
 * `VehicleArt`/`.vehicle-type-hero` cũ (trong vehicle-type-landing.tsx) VẪN giữ nguyên,
 * không xoá — còn dùng cho lưới thẻ /loai-xe và cho hero trang kết hợp tuyến+loại xe
 * (route-vehicle-combo.tsx), chỉ đổi phần hero của riêng trang /loai-xe/[slug].
 */
export function VehicleTypeHero({ category }: { category: VehicleCategory }) {
  return (
    <section className={`vehicle-hero-a ${category.color}`} aria-labelledby="vehicle-hero-title">
      <div className="vehicle-hero-a-media">
        {category.imageUrl ? (
          <MediaPhoto src={category.imageUrl} alt={`${category.label} - ${category.title}`} />
        ) : (
          <BusFront aria-hidden="true" />
        )}
      </div>
      <div className="vehicle-hero-a-overlay" aria-hidden="true" />
      <div className="vehicle-hero-a-copy">
        <Link className="back-link" href="/loai-xe">← Tất cả loại xe</Link>
        <p className="eyebrow"><span className="eyebrow-line" /> {category.label}</p>
        <h1 id="vehicle-hero-title">{category.title}</h1>
        <p>{category.description}</p>
        <Link className="button button-primary" href="/#booking">Tư vấn lịch trình <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

export default VehicleTypeHero;
