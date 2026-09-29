import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

const cars = [
  { seats: "7 chỗ", passengers: "3 – 6 hành khách", slug: "7-cho", position: "center", popular: true },
  { seats: "4 chỗ", passengers: "1 – 3 hành khách", slug: "4-cho", position: "left", popular: false },
  { seats: "16 chỗ", passengers: "7 – 14 hành khách", slug: "16-cho", position: "right", popular: false },
];

export function HomeFleet() {
  return <section className="home-fleet home-container" id="fleet">
    <div className="home-section-heading"><div><h2>Chọn xe phù hợp</h2><p>Đa dạng loại xe, phù hợp với số lượng hành khách và nhu cầu di chuyển.</p></div><Link href="/loai-xe">Xem tất cả loại xe <ArrowRight size={17} /></Link></div>
    <div className="home-fleet-grid">{cars.map((car) => <Link href={`/loai-xe/${car.slug}`} className={`home-fleet-card ${car.popular ? "is-popular" : ""}`} key={car.slug}>
      {car.popular && <span className="home-popular-badge">Được đặt nhiều nhất</span>}
      <div className={`home-fleet-image car-${car.position}`} role="img" aria-label={`Xe ${car.seats}`} />
      <div className="home-fleet-details"><div><h3>Xe {car.seats}</h3><p><Users size={17} /> {car.passengers}</p></div><span aria-hidden="true"><ArrowRight size={20} /></span></div>
    </Link>)}</div>
    <div className="home-carousel-dots" aria-hidden="true"><i /><i /><i /></div>
  </section>;
}
