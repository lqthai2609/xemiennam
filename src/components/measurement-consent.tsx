"use client";
import { useEffect, useState } from "react";
import { rememberMeasurementEntry, setMeasurementConsent } from "@/lib/lead-measurement-client";

export function MeasurementConsent() {
  const [choice, setChoice] = useState<"unknown" | "granted" | "denied">("unknown");
  useEffect(() => { rememberMeasurementEntry(window.location.href, document.referrer); }, []);
  function choose(allowed: boolean) {
    if (allowed) rememberMeasurementEntry(window.location.href, document.referrer);
    setMeasurementConsent(allowed);
    setChoice(allowed ? "granted" : "denied");
  }
  return <aside aria-label="Lựa chọn ghi nhận nguồn truy cập" className="border-b bg-muted/40 px-4 py-3 text-sm">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
      <p className="m-0 flex-1 basis-72">{choice === "unknown"
        ? "Bạn có đồng ý ghi nhận nguồn truy cập và trang bắt đầu của lần xem website này để Alo Đặt Xe đánh giá hiệu quả giới thiệu dịch vụ? Thông tin nguồn hết hạn sau 30 ngày. Lựa chọn này không ảnh hưởng việc đặt xe."
        : choice === "granted" ? "Đã đồng ý ghi nhận nguồn truy cập trong lần xem website này." : "Đã tắt ghi nhận nguồn truy cập."}</p>
      {choice !== "granted" && <button type="button" onClick={() => choose(true)} className="rounded-md border px-3 py-2 font-semibold">{choice === "unknown" ? "Đồng ý" : "Cho phép ghi nhận"}</button>}
      {choice !== "denied" && <button type="button" onClick={() => choose(false)} className="rounded-md border px-3 py-2">{choice === "unknown" ? "Không đồng ý" : "Dừng ghi nhận"}</button>}
    </div>
  </aside>;
}
