import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { DestinationCard } from "@/types/diem-den";
import { formatPublicLocationText, getPublicLocationLabel } from "@/lib/public-location-label";

/** Tách từ destinations-page.tsx (Ngày 25) để trang chủ tái dùng đúng 1 markup — tránh lệch
 * giao diện giữa 2 nơi khi sau này chỉnh sửa. */
export function DestinationCardTile({ destination }: { destination: DestinationCard }) {
  const publicName = getPublicLocationLabel(destination);
  return (
    <Link
      className="destination-card"
      href={`/tuyen-duong/${destination.slug}`}
      aria-label={`Xem các tuyến tại ${publicName}`}
    >
      <div className="destination-card-media">
        {destination.imageUrl ? (
          <Image
            src={destination.imageUrl}
            alt={`Phong cảnh ${publicName}`}
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
        <h2>{publicName}</h2>
        <p>{formatPublicLocationText(destination.blurb)}</p>
        <span className="destination-card-link">
          Xem các tuyến <ArrowRight />
        </span>
      </div>
    </Link>
  );
}

export default DestinationCardTile;
