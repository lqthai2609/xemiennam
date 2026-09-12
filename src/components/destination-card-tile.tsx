import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { DestinationCard } from "@/types/diem-den";

/** Tách từ destinations-page.tsx (Ngày 25) để trang chủ tái dùng đúng 1 markup — tránh lệch
 * giao diện giữa 2 nơi khi sau này chỉnh sửa. */
export function DestinationCardTile({ destination }: { destination: DestinationCard }) {
  return (
    <Link
      className="destination-card"
      href={`/tuyen-duong/${destination.slug}`}
      aria-label={`Xem các tuyến tại ${destination.name}`}
    >
      <div className="destination-card-media">
        {destination.imageUrl ? (
          <Image
            src={destination.imageUrl}
            alt={`Phong cảnh ${destination.name}`}
            fill
            sizes="(max-width: 800px) 100vw, 33vw"
          />
        ) : (
          <div className="destination-card-fallback" aria-hidden="true">
            <MapPin />
          </div>
        )}
        <span className="destination-card-count">{destination.routeCount} tuyến đang chạy</span>
      </div>
      <div className="destination-card-copy">
        <h2>{destination.name}</h2>
        <p>{destination.blurb}</p>
        <span className="destination-card-link">
          Xem các tuyến <ArrowRight />
        </span>
      </div>
    </Link>
  );
}

export default DestinationCardTile;
