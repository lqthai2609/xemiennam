import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Heart, MapPin, Plane } from "lucide-react";
import type { Service } from "@/types/service";

const icons = { wedding: Heart, airport: Plane, monthly: CalendarDays, "city-tour": MapPin };
const fallbackImages = { wedding: "/images/services/wedding.png", airport: "/images/services/airport.png", monthly: "/images/services/monthly.png", "city-tour": "/images/services/city-tour.png" };

export function ServiceCard({ service }: { service: Service }) {
  const Icon = icons[service.icon];
  return (
    <Link href={`/dich-vu/${service.slug}`} className="service-card">
      <div className="service-card-media">
        <Image src={service.image ?? fallbackImages[service.icon]} alt={`Dịch vụ ${service.name}`} fill sizes="(max-width: 800px) 100vw, 50vw" />
        <span className="service-card-icon" aria-label={service.iconLabel}><Icon aria-hidden="true" /></span>
        <span className="service-card-number">{service.slug === "xe-cuoi" ? "01" : service.slug === "dua-don-san-bay" ? "02" : service.slug === "thue-xe-theo-thang" ? "03" : "04"}</span>
      </div>
      <div className="service-card-copy"><p className="section-label">DỊCH VỤ THEO NHU CẦU</p><h2>{service.name}</h2><p>{service.shortDescription}</p><span className="service-card-link">Xem chi tiết <ArrowUpRight aria-hidden="true" /></span></div>
    </Link>
  );
}

export { fallbackImages };
