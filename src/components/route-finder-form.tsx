"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RouteFinderProvince } from "@/lib/route-finder";

/**
 * Form "Tìm tuyến phù hợp" — 3 trường theo tầng: Điểm đến (tỉnh/thành) → Khu vực (bên trong
 * tỉnh đó) → Loại xe. Đây là form duy nhất đặt ngay dưới hero ở trang chủ, /tuyen-duong và
 * /diem-den (thay cho <BookingBar/> cũ — chỉ có điểm đi/điểm đến/ngày đi, không phân theo
 * khu vực trong tỉnh — và bảng lọc thủ công RouteFilter trên /tuyen-duong, cả hai đã bị bỏ).
 * Submit điều hướng sang /tuyen-duong kèm query param — RoutesPageClient đọc và lọc sẵn.
 */
export function RouteFinderForm({ provinces, id }: { provinces: RouteFinderProvince[]; id?: string }) {
  const [regionSlug, setRegionSlug] = useState("");
  const [area, setArea] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  const selectedProvince = useMemo(
    () => provinces.find((p) => p.regionSlug === regionSlug),
    [provinces, regionSlug],
  );
  const selectedArea = useMemo(
    () => selectedProvince?.areas.find((a) => a.name === area),
    [selectedProvince, area],
  );

  function handleProvinceChange(value: string) {
    setRegionSlug(value);
    setArea("");
    setVehicleType("");
  }

  function handleAreaChange(value: string) {
    setArea(value);
    setVehicleType("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProvince || !area || !vehicleType) return;
    const params = new URLSearchParams({
      diem_den: selectedProvince.region,
      khu_vuc: area,
      loai_xe: vehicleType,
    });
    // Điều hướng cứng (thay vì router.push) — form này cũng được đặt ngay trên chính
    // /tuyen-duong, nên điều hướng mềm cùng route sẽ không remount RoutesPageClient,
    // khiến useEffect đọc query mới không chạy lại và bộ lọc không được áp dụng.
    window.location.href = `/tuyen-duong?${params.toString()}`;
  }

  const canSubmit = Boolean(selectedProvince && area && vehicleType);

  return (
    <section className="route-finder" id={id} aria-labelledby="route-finder-title">
      <form className="route-finder-form" onSubmit={handleSubmit}>
        <div className="route-finder-heading">
          <p className="section-label">TÌM TUYẾN PHÙ HỢP</p>
          <h2 id="route-finder-title">Bạn muốn đi đâu?</h2>
        </div>
        <div className="route-finder-fields">
          <label className="route-select-field">
            <span>Điểm đến</span>
            <select value={regionSlug} onChange={(event) => handleProvinceChange(event.target.value)} required>
              <option value="">Chọn tỉnh/thành</option>
              {provinces.map((province) => (
                <option key={province.regionSlug} value={province.regionSlug}>
                  {province.region}
                </option>
              ))}
            </select>
          </label>
          <label className="route-select-field">
            <span>Khu vực</span>
            <select
              value={area}
              onChange={(event) => handleAreaChange(event.target.value)}
              disabled={!selectedProvince}
              required
            >
              <option value="">{selectedProvince ? "Chọn khu vực" : "Chọn điểm đến trước"}</option>
              {selectedProvince?.areas.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="route-select-field">
            <span>Loại xe</span>
            <select
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value)}
              disabled={!selectedArea}
              required
            >
              <option value="">{selectedArea ? "Chọn loại xe" : "Chọn khu vực trước"}</option>
              {selectedArea?.vehicleTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <Button size="lg" type="submit" disabled={!canSubmit}>
            Tìm tuyến <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </form>
    </section>
  );
}
