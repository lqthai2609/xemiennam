"use client";

import Link from "next/link";
import { useState } from "react";

type State = "new" | "quote" | "sent" | "agreed" | "deposit" | "assigned" | "complete" | "lost";
type Event = { from: State | null; to: State; at: string; actor: number; source: string; reason: string | null };
type Lead = { lead_id: number; state: State; history: Event[]; acquisition: Record<string, string | null> | null;
  attribution?: { attribution_status: string; attributed_touch?: { source: string | null; campaign: string | null; landing_path: string | null } | null } };
type Measurement = { retention_days: number; as_of_utc: string; contact_clicks: { phone: number; zalo: number }; saved_requests: number; by_channel: Record<string, number>; limited: boolean };
const channels: Record<string, string> = { organic_search: "Tìm kiếm tự nhiên", paid_search: "Tìm kiếm trả phí", paid_social: "Mạng xã hội trả phí", organic_social: "Mạng xã hội", email: "Email", affiliate: "Đối tác giới thiệu", referral: "Trang giới thiệu", direct: "Truy cập trực tiếp", unknown: "Chưa rõ nguồn", retention_expired: "Nguồn đã hết hạn" };
const labels: Record<State, string> = { new: "Mới", quote: "Báo giá", sent: "Gửi giá", agreed: "Đồng ý", deposit: "Đặt cọc", assigned: "Xếp xe", complete: "Hoàn thành", lost: "Mất khách" };
const next: Record<State, State[]> = { new: ["quote", "lost"], quote: ["sent", "lost"], sent: ["agreed", "quote", "lost"], agreed: ["deposit", "lost"], deposit: ["assigned", "lost"], assigned: ["complete", "lost"], complete: [], lost: [] };

export function LeadAdmin({ csrf, canPublish }: { csrf: string; canPublish: boolean }) {
  const [id, setId] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [to, setTo] = useState<State | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [reportError, setReportError] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  async function loadMeasurement() {
    setReportBusy(true); setReportError("");
    try {
      const response = await fetch("/api/admin/measurement", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error("Chưa tải được báo cáo nguồn khách.");
      setMeasurement(data);
    } catch (e) { setReportError(e instanceof Error ? e.message : "Chưa tải được báo cáo nguồn khách."); }
    finally { setReportBusy(false); }
  }

  async function load() {
    if (!/^\d+$/.test(id)) { setError("Nhập mã yêu cầu hợp lệ."); return; }
    setBusy(true); setError(""); setLead(null); setTo("");
    try {
      const response = await fetch(`/api/admin/leads/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải yêu cầu.");
      setLead(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải yêu cầu."); }
    finally { setBusy(false); }
  }

  async function transition() {
    if (!lead || !to) return;
    if (!window.confirm(`Chuyển yêu cầu #${lead.lead_id} sang “${labels[to]}”?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/leads/${lead.lead_id}/transition`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-gocar-csrf": csrf },
        body: JSON.stringify({ from: lead.state, to, reason, source: "admin" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể chuyển trạng thái.");
      setLead({ ...lead, state: data.state, history: [...lead.history, data.entry] }); setTo(""); setReason("");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể chuyển trạng thái."); }
    finally { setBusy(false); }
  }

  const choices = lead ? next[lead.state].filter((state) => canPublish || !["agreed", "deposit", "assigned", "complete"].includes(state)) : [];
  return <main style={{ maxWidth: 680, margin: "2rem auto", padding: "1rem", display: "grid", gap: "1rem" }}>
    <Link href="/quan-tri">← Quản trị tuyến và giá</Link>
    <h1>Quản lý yêu cầu đặt xe</h1>
    <p>Nhập mã yêu cầu trong thông báo đặt xe. Mọi thay đổi được ghi vào lịch sử; giá báo, đặt xe xác nhận và doanh thu có nguồn dữ liệu riêng.</p>
    <section aria-label="Đo lường nguồn khách">
      <button type="button" disabled={reportBusy} onClick={loadMeasurement}>{reportBusy ? "Đang tải..." : "Xem nguồn khách trong 30 ngày"}</button>
      {reportError && <p role="alert">{reportError}</p>}
      {measurement && <>
        <p>Lượt nhấn liên hệ: gọi điện {measurement.contact_clicks.phone}, Zalo {measurement.contact_clicks.zalo}. Đây là ý định liên hệ, không phải yêu cầu đặt xe.</p>
        <p>Yêu cầu đã lưu: {measurement.saved_requests}. Chưa đồng nghĩa với khách đủ điều kiện hoặc chuyến đã xác nhận.</p>
        <ul>{Object.entries(measurement.by_channel).map(([channel, count]) => <li key={channel}>{channels[channel] || "Nguồn khác"}: {count}</li>)}</ul>
        <p>Dữ liệu cập nhật: {measurement.as_of_utc}.{measurement.limited ? " Báo cáo đạt giới hạn 1.000 bản ghi mỗi nhóm; chưa phải tổng đầy đủ." : ""}</p>
      </>}
    </section>
    <label>Mã yêu cầu <input inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} style={{ width: "100%", padding: 12 }} /></label>
    <button type="button" disabled={busy} onClick={load}>Tìm yêu cầu</button>
    {error && <p role="alert">{error}</p>}
    {lead && <section style={{ display: "grid", gap: "1rem" }}>
      <h2>Yêu cầu #{lead.lead_id}: {labels[lead.state]}</h2>
      <p>Nguồn ghi nhận: {lead.attribution?.attributed_touch?.source || "Chưa xác định"}; chiến dịch: {lead.attribution?.attributed_touch?.campaign || "Chưa xác định"}</p>
      <p>Trang bắt đầu ghi nhận: {lead.attribution?.attributed_touch?.landing_path || "Chưa xác định"}.{lead.attribution?.attribution_status === "retention_expired" ? " Thông tin nguồn đã hết hạn." : ""}</p>
      {choices.length > 0 && <>
        <label>Trạng thái tiếp theo <select value={to} onChange={(e) => setTo(e.target.value as State)} style={{ width: "100%", padding: 12 }}><option value="">Chọn trạng thái</option>{choices.map((choice) => <option key={choice} value={choice}>{labels[choice]}</option>)}</select></label>
        <label>Lý do <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} style={{ width: "100%", padding: 12 }} /></label>
        <button type="button" disabled={busy || !to || (["lost", "quote", "sent"].includes(to) && !reason.trim())} onClick={transition}>Xác nhận chuyển trạng thái</button>
      </>}
      <h3>Lịch sử</h3><ol>{lead.history.map((event, index) => <li key={index}>{event.at}: {event.from ? labels[event.from] : "Tạo yêu cầu"} → {labels[event.to]} · người xử lý #{event.actor} · {event.source}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol>
    </section>}
  </main>;
}
