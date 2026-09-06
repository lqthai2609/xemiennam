import Link from "next/link";
import { CalendarDays, Heart, MapPin, Plane, ArrowUpRight } from "lucide-react";
import type { Service } from "@/types/service";

const icons = { wedding: Heart, airport: Plane, monthly: CalendarDays, "city-tour": MapPin };

export function ServiceCard({ service }: { service: Service }) {
  const Icon = icons[service.icon];
  return (
    <Link href={`/dich-vu/${service.slug}`} className="service-card">
      <div className="service-card-icon" aria-label={service.iconLabel}><Icon aria-hidden="true" /></div>
      <div className="service-card-copy"><p className="section-label">DỊCH VỤ THEO NHU CẦU</p><h2>{service.name}</h2><p>{service.shortDescription}</p></div>
      <ArrowUpRight className="service-card-arrow" aria-hidden="true" />
    </Link>
  );
}
