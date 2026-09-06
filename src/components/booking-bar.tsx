"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Trước bản này, khu vực "tìm kiếm nhanh" ở trang chủ chỉ là <div> tĩnh kèm
 * icon ChevronDown trang trí — không có onClick/state nào cả, nên click vào
 * không xổ ra gì hết (đúng như report). Bản này thay bằng dropdown thật.
 *
 * Điểm đi cố định "TP. Hồ Chí Minh" vì toàn bộ tuyến hiện tại đều xuất phát
 * từ đây (mô hình hub — xem src/data/routes.ts) — click vẫn xổ xuống để nhất
 * quán về hành vi với 2 ô còn lại, nhưng chỉ hiện ghi chú thay vì danh sách
 * chọn, vì thực tế chưa có lựa chọn nào khác.
 */

type FieldKey = "from" | "to" | "date";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date);
}

const QUICK_DATES = [
  { label: "Hôm nay", offsetDays: 0 },
  { label: "Ngày mai", offsetDays: 1 },
];

export function BookingBar({ destinations }: { destinations: string[] }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [dateLabel, setDateLabel] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpenField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(field: FieldKey) {
    setOpenField((current) => (current === field ? null : field));
  }

  function handleFieldKeyDown(event: React.KeyboardEvent, field: FieldKey) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(field);
    }
    if (event.key === "Escape") setOpenField(null);
  }

  function pickQuickDate(offsetDays: number, label: string) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    setDateLabel(`${label} · ${formatDate(date)}`);
    setOpenField(null);
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (destination) params.set("diem_den", destination);
    router.push(params.toString() ? `/tuyen-duong?${params.toString()}` : "/tuyen-duong");
  }

  return (
    <div className="booking-bar" ref={wrapRef}>
      <div
        className={`booking-field${openField === "from" ? " is-open" : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={openField === "from"}
        onClick={() => toggle("from")}
        onKeyDown={(e) => handleFieldKeyDown(e, "from")}
      >
        <MapPin size={18} />
        <div>
          <span>Điểm đi</span>
          <strong>TP. Hồ Chí Minh</strong>
        </div>
        <ChevronDown size={17} />
        {openField === "from" && (
          <div className="booking-dropdown">
            <p className="booking-dropdown-note">
              Xe Miền Nam hiện khởi hành từ TP. Hồ Chí Minh cho mọi tuyến.
            </p>
          </div>
        )}
      </div>

      <div
        className={`booking-field${openField === "to" ? " is-open" : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={openField === "to"}
        onClick={() => toggle("to")}
        onKeyDown={(e) => handleFieldKeyDown(e, "to")}
      >
        <MapPin size={18} />
        <div>
          <span>Điểm đến</span>
          <strong>{destination ?? "Chọn điểm đến"}</strong>
        </div>
        <ChevronDown size={17} />
        {openField === "to" && (
          <div className="booking-dropdown" role="listbox">
            {destinations.length === 0 && (
              <p className="booking-dropdown-note">Chưa có tuyến nào để chọn.</p>
            )}
            {destinations.map((d) => (
              <button
                key={d}
                type="button"
                role="option"
                aria-selected={destination === d}
                onClick={(e) => {
                  e.stopPropagation();
                  setDestination(d);
                  setOpenField(null);
                }}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={`booking-field${openField === "date" ? " is-open" : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={openField === "date"}
        onClick={() => toggle("date")}
        onKeyDown={(e) => handleFieldKeyDown(e, "date")}
      >
        <CalendarDays size={18} />
        <div>
          <span>Ngày đi</span>
          <strong>{dateLabel ?? "Chọn ngày"}</strong>
        </div>
        <ChevronDown size={17} />
        {openField === "date" && (
          <div className="booking-dropdown">
            {QUICK_DATES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pickQuickDate(q.offsetDays, q.label);
                }}
              >
                {q.label}
              </button>
            ))}
            <label className="booking-dropdown-date" onClick={(e) => e.stopPropagation()}>
              <span>Chọn ngày khác</span>
              <input
                type="date"
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDateLabel(formatDate(new Date(e.target.value)));
                  setOpenField(null);
                }}
              />
            </label>
          </div>
        )}
      </div>

      <Button size="lg" onClick={handleSearch}>
        Tìm chuyến <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}
