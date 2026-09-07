import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, BusFront, Check, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPhoto } from "@/components/media-photo";
import type { Vehicle } from "@/types/vehicle";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) { return <article className="vehicle-card"><div className={`vehicle-art ${vehicle.color}`} role="img" aria-label={vehicle.imageLabel}>{vehicle.images[0] ? <MediaPhoto src={vehicle.images[0]} alt={vehicle.imageLabel} /> : <BusFront />}</div><div className="vehicle-card-body">{vehicle.badge && <span className="vehicle-badge">{vehicle.badge}</span>}<p className="vehicle-type">{vehicle.type}</p><h3>{vehicle.name}</h3><p className="vehicle-description">{vehicle.description}</p><div className="vehicle-meta"><span><UsersRound /> {vehicle.seats}</span><span><BriefcaseBusiness /> {vehicle.capacity}</span></div><div className="vehicle-card-footer"><span className="vehicle-driver"><Check /> {vehicle.driverIncluded ? "Có tài xế" : "Tự lái"}</span><Link href={`/doi-xe/${vehicle.slug}`}>Xem xe <ArrowRight /></Link></div></div></article>; }

export function VehicleResults({ vehicles, onClearFilters }: { vehicles: Vehicle[]; onClearFilters: () => void }) { if (!vehicles.length) return <div className="route-empty"><BusFront /><h2>Chưa có xe phù hợp</h2><p>Thử thay đổi loại xe, số chỗ hoặc hình thức thuê.</p><Button variant="outline" onClick={onClearFilters}>Xóa bộ lọc</Button></div>; return <div className="vehicle-grid" aria-live="polite">{vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div>; }
