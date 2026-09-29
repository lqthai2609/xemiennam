"use client";

import Link from "next/link";
import { useState } from "react";

type State = "new" | "quote" | "sent" | "agreed" | "deposit" | "assigned" | "complete" | "lost";
type Event = { from: State | null; to: State; at: string; actor: number; source: string; reason: string | null };
type Lead = { lead_id: number; state: State; history: Event[]; acquisition: Record<string, string | null> | null };
const labels: Record<State, string> = { new: "Mới", quote: "Báo giá", sent: "Gửi giá", agreed: "Đồng ý", deposit: "Đặt cọc", assigned: "Xếp xe", complete: "Hoàn thành", lost: "Mất khách" };
const next: Record<State, State[]> = { new: ["quote", "lost"], quote: ["sent", "lost"], sent: ["agreed", "quote", "lost"], agreed: ["deposit", "lost"], deposit: ["assigned", "lost"], assigned: ["complete", "lost"], complete: [], lost: [] };

export function LeadAdmin({ csrf, canPublish }: { csrf: string; canPublish: boolean }) {
  const [id, setId] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [to, setTo] = useState<State | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    <label>Mã yêu cầu <input inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} style={{ width: "100%", padding: 12 }} /></label>
    <button type="button" disabled={busy} onClick={load}>Tìm yêu cầu</button>
    {error && <p role="alert">{error}</p>}
    {lead && <section style={{ display: "grid", gap: "1rem" }}>
      <h2>Yêu cầu #{lead.lead_id}: {labels[lead.state]}</h2>
      <p>Nguồn ghi nhận: {lead.acquisition?.source || "Chưa xác định"}; chiến dịch: {lead.acquisition?.campaign || "Chưa xác định"}</p>
      {choices.length > 0 && <>
        <label>Trạng thái tiếp theo <select value={to} onChange={(e) => setTo(e.target.value as State)} style={{ width: "100%", padding: 12 }}><option value="">Chọn trạng thái</option>{choices.map((choice) => <option key={choice} value={choice}>{labels[choice]}</option>)}</select></label>
        <label>Lý do <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} style={{ width: "100%", padding: 12 }} /></label>
        <button type="button" disabled={busy || !to || (["lost", "quote", "sent"].includes(to) && !reason.trim())} onClick={transition}>Xác nhận chuyển trạng thái</button>
      </>}
      <h3>Lịch sử</h3><ol>{lead.history.map((event, index) => <li key={index}>{event.at}: {event.from ? labels[event.from] : "Tạo yêu cầu"} → {labels[event.to]} · người xử lý #{event.actor} · {event.source}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol>
    </section>}
  </main>;
}
