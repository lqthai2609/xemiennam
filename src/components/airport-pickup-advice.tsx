"use client";

import { useEffect, useRef, useState } from "react";
import { readAirportPickupResult, type AirportPickupRequest, type AirportPickupResult } from "@/lib/airport-timing";

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
const reasons = {
  missing_information: "Cần tư vấn: bổ sung số hiệu, giờ bay, loại chuyến bay và nhà ga để kiểm tra.",
  unverified_policy: "Cần tư vấn: chưa có cấu hình giờ đón được Vận hành xác nhận.",
  outside_policy: "Cần tư vấn: thông tin chuyến chưa khớp cấu hình đang được xác nhận.",
  pickup_in_past: "Cần tư vấn: giờ đón tính được đã qua. Vui lòng liên hệ để kiểm tra lại lịch.",
  unavailable: "Cần tư vấn: chưa kiểm tra được giờ đón. Bạn vẫn có thể gửi yêu cầu tư vấn.",
};

/** Parent keys this component by all flight/route inputs so old advice cannot reappear. */
export function AirportPickupAdvice({ input }: { input: AirportPickupRequest }) {
  const [result, setResult] = useState<AirportPickupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; controller.current?.abort(); }, []);
  useEffect(() => {
    if (result?.status !== "suggested") return;
    const expire = () => { setResult(null); setMessage("Gợi ý đã hết thời gian kiểm tra. Vui lòng kiểm tra lại giờ đón."); };
    const timer = setTimeout(expire, Math.max(0, Date.parse(result.valid_until) - Date.now()));
    const checkVisibility = () => { if (Date.now() >= Date.parse(result.valid_until)) expire(); };
    document.addEventListener("visibilitychange", checkVisibility);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", checkVisibility); };
  }, [result]);

  async function check() {
    controller.current?.abort();
    const requestNumber = ++sequence.current;
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 8000);
    setResult(null); setMessage(""); setLoading(true);
    try {
      const response = await fetch("/api/airport-pickup-suggestion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: abort.signal });
      const read = readAirportPickupResult(await response.json());
      if (requestNumber !== sequence.current) return;
      if (!read || (!response.ok && read.status !== "needs_consultation")) throw new Error("unavailable");
      if (read.status === "suggested" && (read.route_id !== input.route_id || read.direction !== input.direction || read.movement !== input.movement || Date.parse(read.valid_until) <= Date.now())) throw new Error("invalid suggestion");
      setResult(read);
    } catch {
      if (requestNumber === sequence.current) setMessage(reasons.unavailable);
    } finally {
      clearTimeout(timer);
      if (requestNumber === sequence.current) setLoading(false);
    }
  }
  return <div className="airport-pickup-advice rounded-lg border border-border bg-secondary/40 p-3">
    <p className="mb-2 text-xs leading-5 text-muted-foreground">Ngày giờ theo giờ Việt Nam. Gợi ý cần được tư vấn xác nhận; lịch bay do bạn cung cấp, chưa được kiểm chứng với hãng bay.</p>
    <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={check} disabled={loading}>{loading ? "Đang kiểm tra giờ đón…" : "Kiểm tra giờ đón gợi ý"}</button>
    <div aria-live="polite" role="status" className="mt-2 text-sm leading-6">
      {message && <p>{message}</p>}
      {result?.status === "needs_consultation" && <><p>{reasons[result.reason]}</p>{result.issues.map((issue) => <p key={issue.field}>{issue.message}</p>)}</>}
      {result?.status === "suggested" && <div className="airport-pickup-result">
        <p><strong>Giờ đón gợi ý: {timeLabel(result.pickup_at)}</strong></p>
        {result.movement === "departure" && <p>Giờ có mặt tại sân bay: {timeLabel(result.airport_at)}</p>}
        <p>{result.movement === "arrival" ? "Thời gian chờ sau hạ cánh" : "Thời gian dự phòng trước giờ bay"}: {result.buffer_minutes} phút.</p>
        {result.travel_minutes !== null && <p>Thời gian di chuyển theo tuyến đã xác nhận: {result.travel_minutes} phút.</p>}
        <p className="text-xs text-muted-foreground">Giờ đón thực tế còn cần kiểm tra điểm đón, giao thông và thay đổi lịch bay.</p>
      </div>}
      {!result && !message && !loading && <p className="text-muted-foreground">Chưa kiểm tra giờ đón. Thiếu dữ liệu giữ cần tư vấn.</p>}
    </div>
  </div>;
}
