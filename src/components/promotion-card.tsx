import Link from "next/link";
import { ArrowRight, BusFront, CalendarClock, MapPin, Percent, Tag } from "lucide-react";
import type { Promotion } from "@/types/promotion";
import { formatVNDate } from "@/lib/wp";

/**
 * Thẻ khuyến mãi (Ngày 18) — đúng bố cục mục 9 xemiennam-v0-prompts.md: badge giảm giá,
 * tên chương trình, thời gian áp dụng, tuyến/loại xe áp dụng, CTA. Khuyến mãi hết hạn
 * (promotion.isExpired) hiển thị mờ + nhãn "Đã kết thúc", CTA bị vô hiệu hoá.
 */
export function PromotionCard({ promotion }: { promotion: Promotion }) {
  const DiscountIcon = promotion.discountType === "phan_tram" ? Percent : Tag;

  return (
    <article className={`promo-card${promotion.isExpired ? " is-expired" : ""}`}>
      <div className="promo-card-top">
        <span className="promo-badge">
          <DiscountIcon size={13} /> {promotion.discountLabel}
        </span>
        {promotion.isExpired && <span className="promo-status">Đã kết thúc</span>}
      </div>

      <h3>{promotion.name}</h3>
      {promotion.description && <p className="promo-description">{promotion.description}</p>}

      <div className="promo-meta">
        <span>
          <CalendarClock size={14} /> {formatVNDate(promotion.startDate)} – {formatVNDate(promotion.endDate)}
        </span>
        <span>
          <MapPin size={14} /> {promotion.routeLabels.length ? promotion.routeLabels.join(", ") : "Tất cả tuyến"}
        </span>
        <span>
          <BusFront size={14} /> {promotion.vehicleTypeLabels.length ? promotion.vehicleTypeLabels.join(", ") : "Mọi loại xe"}
        </span>
      </div>

      {promotion.isExpired ? (
        <span className="button promo-cta-disabled" aria-disabled="true">
          Chương trình đã kết thúc
        </span>
      ) : (
        <Link className="button button-primary promo-cta" href="/#booking">
          Liên hệ nhận ưu đãi <ArrowRight size={15} />
        </Link>
      )}
    </article>
  );
}
