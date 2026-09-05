"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterState, hasActiveFilters } from "@/types/route";

interface RouteFilterProps {
  regions: string[];
  vehicleTypes: string[];
  seatOptions: string[];
  filters: FilterState;
  resultCount: number;
  onFilterChange: (filters: FilterState) => void;
}

export function RouteFilter({ regions, vehicleTypes, seatOptions, filters, resultCount, onFilterChange }: RouteFilterProps) {
  const update = (key: keyof FilterState, value: string) => onFilterChange({ ...filters, [key]: value });
  const active = hasActiveFilters(filters);

  return (
    <section className="route-filter" aria-labelledby="route-filter-title">
      <div className="route-filter-heading">
        <div>
          <p className="section-label">TÌM TUYẾN PHÙ HỢP</p>
          <h2 id="route-filter-title">Lọc theo nhu cầu của bạn.</h2>
        </div>
        <span className="route-count"><strong>{resultCount}</strong> tuyến được tìm thấy</span>
      </div>
      <div className="route-filter-fields">
        <label className="route-select-field"><span>Khu vực / điểm đến</span><select value={filters.region} onChange={(event) => update("region", event.target.value)}><option value="">Tất cả điểm đến</option>{regions.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
        <label className="route-select-field"><span>Loại xe</span><select value={filters.vehicleType} onChange={(event) => update("vehicleType", event.target.value)}><option value="">Tất cả loại xe</option>{vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="route-select-field"><span>Số chỗ</span><select value={filters.seats} onChange={(event) => update("seats", event.target.value)}><option value="">Mọi số chỗ</option>{seatOptions.map((seats) => <option key={seats} value={seats}>{seats}</option>)}</select></label>
        {active && <Button type="button" variant="outline" className="clear-filter" onClick={() => onFilterChange({ region: "", vehicleType: "", seats: "" })}><RotateCcw data-icon="inline-start" /> Xóa bộ lọc</Button>}
      </div>
    </section>
  );
}
