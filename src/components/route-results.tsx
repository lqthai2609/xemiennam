import Link from "next/link";
import { ArrowRight, Clock3, Milestone, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Route } from "@/types/route";

interface RouteResultsProps {
  routes: Route[];
  onClearFilters: () => void;
}

export function RouteResults({ routes, onClearFilters }: RouteResultsProps) {
  if (!routes.length) {
    return <div className="route-empty"><RouteIcon size={34} /><h2>Chưa có tuyến phù hợp</h2><p>Thử chọn lại bộ lọc để khám phá thêm những hành trình khác.</p><Button variant="outline" onClick={onClearFilters}>Xóa bộ lọc</Button></div>;
  }

  return <div className="route-results" aria-live="polite">{routes.map((route) => <article className="route-ticket" key={route.id}>
    <div className="rt-price"><span>Giá từ</span><b>{route.price}</b></div>
    <div className="rt-body"><div className="rt-route"><span>{route.from}</span><ArrowRight size={16} /><span>{route.to}</span></div><div className="rt-meta"><span><Clock3 size={13} /> {route.time}</span><span><Milestone size={13} /> {route.distance}</span><span className="rt-vehicles">{route.vehicleTypes.join(" · ")}</span></div></div>
    <div className="rt-cta"><Link href={`/tuyen-duong/${route.slug}`}>Xem chi tiết <ArrowRight size={14} /></Link></div>
  </article>)}</div>;
}
