"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZaloIcon } from "@/components/zalo-icon";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_HOTLINE_TEL } from "@/lib/site-config";
import { airportConsultationLabel, buildAirportConsultationDraft, type AirportConsultationJourney } from "@/lib/airport-consultation";

function ConsultationDialog({ journeys, onClose }: { journeys: AirportConsultationJourney[]; onClose: () => void }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(journeys[0].key);
  const [passengers, setPassengers] = useState("");
  const [bags, setBags] = useState("");
  const [luggageDetails, setLuggageDetails] = useState("");
  const [nameplate, setNameplate] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copySequence = useRef(0);
  const journey = journeys.find((item) => item.key === selected) || journeys[0];
  const draft = buildAirportConsultationDraft(journey, { passengers, bags, luggageDetails, nameplate });

  useEffect(() => {
    const generation = copySequence;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { document.body.style.overflow = previousOverflow; generation.current++; };
  }, []);

  function changed() { copySequence.current++; setCopyState("idle"); }
  async function copyDraft() {
    const sequence = ++copySequence.current;
    try {
      await navigator.clipboard.writeText(draft.text);
      if (sequence === copySequence.current) setCopyState("copied");
    } catch {
      if (sequence === copySequence.current) setCopyState("failed");
    }
  }

  return <div className="quick-booking-overlay" onClick={onClose}>
    <div ref={panel} className="quick-booking-panel" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (e.key !== "Tab") return;
      const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }}>
      <button type="button" className="quick-booking-close" aria-label="Đóng tư vấn sân bay" onClick={onClose}><X size={18} /></button>
      <p className="section-label">TƯ VẤN NHANH SÂN BAY</p>
      <h3 id={`${id}-title`}>{airportConsultationLabel(journey.context)}</h3>
      <p>Chuẩn bị thông tin rồi sao chép và tự gửi qua Zalo. Xe, giờ đón, giá và bảng tên cần được xác nhận riêng.</p>
      <div className="quick-booking-form" onChange={changed}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Hành trình
          <select aria-label="Hành trình" className="form-control" value={selected} onChange={(e) => { setSelected(e.target.value); setNameplate(false); }}>
            {journeys.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}
          </select>
        </label>
        <p className="m-0 text-sm break-words">{journey.label}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Số khách<input className="form-control" inputMode="numeric" type="number" min="1" step="1" value={passengers} onChange={(e) => setPassengers(e.target.value)} placeholder="Chưa rõ, để trống" /></label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Số kiện hành lý<input className="form-control" inputMode="numeric" type="number" min="0" step="1" value={bags} onChange={(e) => setBags(e.target.value)} placeholder="Chưa rõ, để trống" /></label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Kích thước hoặc loại hành lý<input className="form-control" maxLength={160} value={luggageDetails} onChange={(e) => setLuggageDetails(e.target.value)} placeholder="Ví dụ: vali, xe đẩy, hành lý cồng kềnh" /></label>
        <p className="text-sm">Số kiện chưa đủ để xác định xe phù hợp. Hãy cung cấp kích thước hoặc loại hành lý để được tư vấn.</p>
        {journey.context === "pickup_from_airport" && <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={nameplate} onChange={(e) => setNameplate(e.target.checked)} /><span>Muốn hỏi về bảng tên đón khách</span></label>}
        <details><summary>Cần chuẩn bị gì khi tư vấn?</summary><p>Cho biết chiều đi, số khách và hành lý. Khi trao đổi trực tiếp, cung cấp ngày giờ trên vé và nhà ga nếu đã biết. Chưa rõ thông tin nào, hãy yêu cầu tư vấn thông tin đó.</p></details>
        <details><summary>{journey.context === "pickup_from_airport" ? "Bảng tên hoặc giờ đón đã được xác nhận chưa?" : "Giờ đón để tiễn ra sân bay đã được xác nhận chưa?"}</summary><p>{journey.context === "pickup_from_airport" ? "Chưa. Đánh dấu bảng tên là ghi nhận nhu cầu. " : "Chưa. "}Gợi ý giờ đón trong form chuyến chỉ xuất hiện khi có dữ liệu được duyệt; khách cần trao đổi để xác nhận điều kiện phục vụ.</p></details>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Nội dung tư vấn<textarea className="form-control min-h-44" readOnly value={draft.text} /></label>
        {draft.error && <p role="alert" className="text-sm text-destructive">{draft.error}</p>}
        <Button type="button" disabled={!!draft.error} onClick={copyDraft}>Sao chép nội dung tư vấn</Button>
        <p role="status" className="text-sm">{copyState === "copied" ? "Đã sao chép. Mở Zalo, dán nội dung và tự gửi khi sẵn sàng." : copyState === "failed" ? "Chưa sao chép được. Bạn có thể chọn và sao chép nội dung trong ô phía trên hoặc gọi tư vấn." : "Nội dung chưa được gửi. Không nhập số điện thoại, địa chỉ riêng hoặc tên trên bảng tại đây."}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="zalo-cta"><a href={getZaloChatLink()} target="_blank" rel="noopener noreferrer"><ZaloIcon /> Mở Zalo tư vấn</a></Button>
          <Button asChild variant="outline"><a href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={16} /> Gọi tư vấn</a></Button>
        </div>
      </div>
    </div>
  </div>;
}

export function AirportQuickConsultation({ journeys }: { journeys: AirportConsultationJourney[] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const liveJourneys = journeys.filter((item) => !item.prelaunch);
  if (!liveJourneys.length) return null;
  function close() { setOpen(false); trigger.current?.focus(); }
  return <>
    <Button ref={trigger} type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>{airportConsultationLabel(liveJourneys[0].context)}</Button>
    {open && createPortal(<ConsultationDialog key={JSON.stringify(liveJourneys)} journeys={liveJourneys} onClose={close} />, document.body)}
  </>;
}
