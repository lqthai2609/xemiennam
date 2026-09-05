"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { driverOptions, emptyVehicleFilters, hasVehicleFilters, seatOptions, vehicleTypes, type VehicleFilters } from "@/types/vehicle";

export function VehicleFilter({ filters, resultCount, onFilterChange }: { filters: VehicleFilters; resultCount: number; onFilterChange: (filters: VehicleFilters) => void }) {
  const update = (key: keyof VehicleFilters, value: string) => onFilterChange({ ...filters, [key]: value });
  return <section className="vehicle-filter" aria-labelledby="vehicle-filter-title"><div className="vehicle-filter-heading"><div><p className="section-label">LỌC ĐỘI XE</p><h2 id="vehicle-filter-title">Tìm chiếc xe hợp với nhóm của bạn</h2></div><span className="route-count"><strong>{resultCount}</strong> xe phù hợp</span></div><div className="vehicle-filter-fields"><label><span>Loại xe</span><select value={filters.type} onChange={(event) => update("type", event.target.value)}><option value="">Tất cả loại xe</option>{vehicleTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>Số chỗ</span><select value={filters.seats} onChange={(event) => update("seats", event.target.value)}><option value="">Mọi số chỗ</option>{seatOptions.map((seats) => <option key={seats}>{seats}</option>)}</select></label><label><span>Hình thức</span><select value={filters.driver} onChange={(event) => update("driver", event.target.value)}><option value="">Có tài xế hoặc tự lái</option>{driverOptions.map((driver) => <option key={driver}>{driver}</option>)}</select></label>{hasVehicleFilters(filters) && <Button type="button" variant="outline" className="clear-filter" onClick={() => onFilterChange(emptyVehicleFilters)}><RotateCcw data-icon="inline-start" /> Xóa bộ lọc</Button>}</div></section>;
}
