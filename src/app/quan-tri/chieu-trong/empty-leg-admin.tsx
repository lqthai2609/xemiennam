"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createEmptyLegDraft } from "@/lib/empty-leg";
import { dispatchEditable, dispatchInstant, dispatchMoney, dispatchWallTime, type DispatchOption, type DispatchRecord } from "@/lib/empty-leg-admin";
import type { EmptyLegModel, EmptyLegStatus } from "@/types/empty-leg";
import styles from "./empty-leg-admin.module.css";

const labels: Record<EmptyLegStatus, string> = { draft: "Bản nháp", inactive: "Tạm ngừng", available: "Còn chuyến", reserved: "Đang giữ chỗ", completed: "Hoàn thành", cancelled: "Đã hủy" };
const states: Record<string, string> = { ...labels, invalid: "Cần kiểm tra lại nguồn dữ liệu", expired: "Đã hết hạn", eligible: "Đủ điều kiện nội bộ", not_yet_available: "Chưa đến thời gian áp dụng" };
const money = (value: number | null) => value === null ? "Chưa có giá" : `${value.toLocaleString("vi-VN")} đồng`;
type Pending = { path: string; body: string };

export function EmptyLegAdmin({ csrf, canPublish }: { csrf: string; canPublish: boolean }) {
  const [items, setItems] = useState<DispatchRecord[]>([]);
  const [options, setOptions] = useState<DispatchOption[]>([]);
  const [record, setRecord] = useState<DispatchRecord | null>(null);
  const [model, setModel] = useState<EmptyLegModel>(createEmptyLegDraft);
  const [reason, setReason] = useState("");
  const [lookup, setLookup] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [ready, setReady] = useState(false);
  const [conflict, setConflict] = useState(false);
  const pending = useRef<Pending | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      try {
        const [list, choices] = await Promise.all([fetch("/api/admin/empty-legs", { cache: "no-store", signal: controller.signal }), fetch("/api/admin/empty-legs/options", { cache: "no-store", signal: controller.signal })]);
        const [a, b] = await Promise.all([list.json(), choices.json()]);
        if (!list.ok || !choices.ok) throw new Error(a.message || b.message || "Chưa tải được dữ liệu điều phối.");
        setItems(a.items); setOptions(b.options); setReady(true);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Không tải được dữ liệu."); }
    }
    void initialize();
    return () => controller.abort();
  }, []);

  function adopt(data: DispatchRecord) { setRecord(data); setModel(data.model); setReason(""); setConflict(false); }
  async function load(id: number) {
    if (inFlight.current || uncertain) return;
    inFlight.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/empty-legs/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không tải được chuyến.");
      adopt(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được chuyến."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function choose(key: string) {
    const choice = options.find((o) => o.key === key);
    // Only copy the explicitly selected current tuple; never infer vehicle, approval or special price.
    setModel((m) => ({ ...m, scope: choice?.scope ?? null, prices: { ...m.prices, normal_price_vnd: choice?.reference.normalPriceVnd ?? null, special_price_vnd: null }, approval: { status: "draft", source_ref: null }, status: "draft" }));
  }
  async function save(confirm: boolean, retry = false) {
    if (inFlight.current || conflict || !ready) return;
    setError(""); setMessage("");
    if (!retry) {
      const candidate = { ...model, departure: model.departure?.date && model.departure?.time ? model.departure : null, approval: { ...model.approval, status: confirm ? "confirmed" as const : "draft" as const } };
      if (!reason.trim()) { setError("Nhập lý do thay đổi."); return; }
      if (confirm && !candidate.approval.source_ref?.trim()) { setError("Nhập mã nguồn xác nhận của Vận hành."); return; }
      pending.current = { path: record ? `/api/admin/empty-legs/${record.id}` : "/api/admin/empty-legs", body: JSON.stringify({ model: candidate, expected_revision: record?.model.revision ?? 0, reason: reason.trim(), operation_key: crypto.randomUUID(), action: confirm ? "confirm" : "save" }) };
    }
    const operation = pending.current;
    if (!operation) return;
    inFlight.current = true; setBusy(true);
    try {
      const response = await fetch(operation.path, { method: "POST", headers: { "Content-Type": "application/json", "x-gocar-csrf": csrf }, body: operation.body });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500 || data.code === "write_busy") setUncertain(true);
        else { pending.current = null; setUncertain(false); if (data.code === "revision_conflict") setConflict(true); }
        throw new Error(data.message || "Chưa lưu được chuyến.");
      }
      pending.current = null; setUncertain(false); adopt(data);
      setItems((old) => [data, ...old.filter((i) => i.id !== data.id)].slice(0, 50));
      setMessage(`Đã lưu chuyến #${data.id}, phiên bản ${data.model.revision}. ${data.confirmation ? "Máy chủ đã ghi xác nhận Vận hành." : "Chuyến được lưu chưa xác nhận."}`);
    } catch (e) {
      if (pending.current) setUncertain(true);
      setError(e instanceof Error ? e.message : "Chưa biết kết quả lưu. Thử lại cùng thao tác.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  const editable = dispatchEditable(record, canPublish);
  const frozen = record?.model.status === "reserved";
  const scopeKey = model.scope ? `${model.scope.route_id}:${model.scope.direction}:${model.scope.vehicle_id}` : "";
  const choice = options.find((o) => o.key === scopeKey);
  const statusChoices: EmptyLegStatus[] = canPublish ? ["draft", "inactive", "available", "reserved", "completed", "cancelled"] : ["draft", "inactive", "cancelled"];
  function inputInstant(key: "valid_from" | "expires_at", value: string) {
    try { setModel((m) => ({ ...m, [key]: dispatchInstant(value) })); setError(""); }
    catch (e) { setError((e as Error).message); }
  }
  function inputMoney(value: string) {
    try { const n = dispatchMoney(value); setModel((m) => ({ ...m, prices: { ...m.prices, special_price_vnd: n } })); setError(""); }
    catch (e) { setError((e as Error).message); }
  }
  return <main className={styles.main}>
    <Link href="/quan-tri">Quản trị tuyến và giá</Link>
    <h1>Điều phối chuyến xe chiều trống</h1>
    <Link href="/quan-tri/chieu-trong/xem-truoc">Xem trước thẻ chuyến và giá riêng</Link>
    <p className={styles.notice}>Công cụ nội bộ. Chỉ nhập thông tin được Vận hành xác nhận. Chuyến chưa mở bán cho khách; ghi giữ chỗ tại đây không tạo đặt xe hoặc gửi thông báo.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    {uncertain && <div className={styles.notice}><p>Kết quả lưu chưa rõ. Biểu mẫu được khóa để tránh tạo trùng chuyến.</p><button disabled={busy} onClick={() => save(false, true)}>Thử lại cùng thao tác</button></div>}
    <div className={styles.layout}>
      <aside className={styles.panel}>
        <h2>Danh sách nội bộ</h2>
        <button disabled={busy || uncertain || !ready} onClick={() => { setRecord(null); setModel(createEmptyLegDraft()); setReason(""); setError(""); setMessage(""); setConflict(false); }}>Tạo chuyến mới</button>
        <fieldset disabled={busy || uncertain}><label>Tìm theo mã chuyến<input inputMode="numeric" value={lookup} onChange={(e) => setLookup(e.target.value)} /></label>
          <div className={styles.actions}><button onClick={() => { if (/^[1-9]\d*$/.test(lookup) && Number.isSafeInteger(Number(lookup))) void load(Number(lookup)); else setError("Nhập mã chuyến hợp lệ."); }}>Tìm chuyến</button></div></fieldset>
        <p>Hiển thị tối đa 50 chuyến mới nhất trong phạm vi được phép.</p>
        <div className={styles.list}>{items.map((item) => <button disabled={busy || uncertain} key={item.id} onClick={() => load(item.id)}>#{item.id} · {states[item.assessment.state] ?? item.assessment.state}<br />{item.model.departure?.date ?? "Chưa có ngày"} · {money(item.model.prices.special_price_vnd)}</button>)}</div>
        {ready && !items.length && <p>Chưa có chuyến được lưu.</p>}
      </aside>
      <section className={styles.panel} aria-busy={busy}>
        <h2>{record ? `Chuyến #${record.id} · phiên bản ${record.model.revision}` : "Chuyến mới chưa lưu"}</h2>
        {record && <p>Máy chủ đánh giá khi tải/lưu: {states[record.assessment.state] ?? record.assessment.state}. Hạn hiệu lực được kiểm lại tại mỗi lần xác nhận.</p>}
        {!editable && <p className={styles.notice}>Chuyến chỉ được xem với quyền hiện tại hoặc đã kết thúc.</p>}
        {conflict && <div className={styles.notice}><p>Chuyến đã thay đổi. Giữ nội dung đang nhập để đối chiếu, sau đó tải bản mới trước khi sửa tiếp.</p><button disabled={busy} onClick={() => record && load(record.id)}>Tải phiên bản mới</button></div>}
        <fieldset disabled={busy || uncertain || conflict || !editable || !ready}>
          <div className={styles.grid}>
            <label className={styles.wide}>Tuyến, chiều và loại xe · gói một chiều<select value={scopeKey} disabled={frozen} onChange={(e) => choose(e.target.value)}><option value="">Chưa chọn, giữ bản nháp</option>{scopeKey && !choice && <option value={scopeKey}>Tổ hợp đã lưu cần kiểm tra lại nguồn</option>}{options.map((o) => <option key={o.key} value={o.key}>{o.label}{o.reference.prelaunch || o.reference.mappingBlocked ? " · đang bị chặn" : o.reference.pricingMode !== "fixed" ? " · cần báo giá" : ""}</option>)}</select></label>
            {model.scope && <p className={styles.wide}>Chiều: {model.scope.direction === "outbound" ? "chiều đi" : "chiều về"}; điểm đi #{model.scope.origin_location_id}, điểm đến #{model.scope.destination_location_id}. Giá thường từ Pricing V2: {money(model.prices.normal_price_vnd)}. Chọn lại tổ hợp khi giá hoặc thông tin tuyến thay đổi.</p>}
            <label>Ngày khởi hành tại Việt Nam<input type="date" disabled={frozen} value={model.departure?.date ?? ""} onChange={(e) => setModel((m) => ({ ...m, departure: e.target.value ? { date: e.target.value, time: m.departure?.time ?? "", timezone: "Asia/Ho_Chi_Minh" } : null }))} /></label>
            <label>Giờ khởi hành tại Việt Nam<input type="time" disabled={frozen} value={model.departure?.time ?? ""} onChange={(e) => setModel((m) => ({ ...m, departure: m.departure ? { ...m.departure, time: e.target.value } : null }))} /></label>
            <label>Giá riêng được Vận hành duyệt · đồng<input inputMode="numeric" disabled={frozen} value={model.prices.special_price_vnd ?? ""} onChange={(e) => inputMoney(e.target.value)} /></label>
            <label>Trạng thái nội bộ<select value={model.status} onChange={(e) => setModel((m) => ({ ...m, status: e.target.value as EmptyLegStatus }))}>{statusChoices.map((s) => <option key={s} value={s}>{labels[s]}</option>)}</select></label>
            <label>Bắt đầu áp dụng · giờ Việt Nam<input type="datetime-local" disabled={frozen} value={dispatchWallTime(model.valid_from)} onChange={(e) => inputInstant("valid_from", e.target.value)} /></label>
            <label>Hết hạn · giờ Việt Nam<input type="datetime-local" disabled={frozen} value={dispatchWallTime(model.expires_at)} onChange={(e) => inputInstant("expires_at", e.target.value)} /></label>
            <label className={styles.wide}>Mã nguồn xác nhận của Vận hành<input maxLength={500} value={model.approval.source_ref ?? ""} onChange={(e) => setModel((m) => ({ ...m, approval: { ...m.approval, source_ref: e.target.value || null } }))} placeholder="Mã hồ sơ hoặc biên nhận đã được duyệt" /></label>
            <label className={styles.wide}>Lý do thay đổi<textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          </div>
          <div className={styles.actions}><button onClick={() => save(false)} disabled={!["draft", "inactive", "cancelled"].includes(model.status)}>Lưu chưa xác nhận</button>{canPublish && <button className={styles.primary} onClick={() => save(true)} disabled={model.status === "draft"}>Xác nhận Vận hành và lưu</button>}</div>
        </fieldset>
        <p>Dữ liệu còn thiếu giữ bản nháp hoặc tạm ngừng. Xác nhận phải đủ nguồn, tuyến, chiều, loại xe, ngày giờ, giá và thời hạn. Hết hạn không được tự gia hạn.</p>
        {record && <>
          <h2>Xác nhận từ máy chủ</h2>
          <p>{record.confirmation ? `Người xác nhận #${record.confirmation.actor}; lúc ${dispatchWallTime(record.confirmation.at).replace("T", " ")} giờ Việt Nam; phiên bản ${record.confirmation.revision}; nguồn ${record.confirmation.source_ref}.` : "Chưa có xác nhận hiệu lực từ máy chủ."}</p>
          <h2>Lịch sử thay đổi</h2>
          <ol className={styles.history}>{record.history.map((entry) => <li key={entry.after.revision}>Phiên bản {entry.after.revision} · {dispatchWallTime(entry.at).replace("T", " ")} giờ Việt Nam · người sửa #{entry.actor} · {entry.action === "confirm" ? "Xác nhận" : "Lưu chưa xác nhận"} · {entry.reason}
            <details><summary>Xem dữ liệu trước và sau</summary><pre>{JSON.stringify({ truoc: entry.before, sau: entry.after }, null, 2)}</pre></details></li>)}</ol>
        </>}
      </section>
    </div>
  </main>;
}
