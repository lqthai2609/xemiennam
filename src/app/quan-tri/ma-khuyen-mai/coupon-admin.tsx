"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { CouponConfig, CouponOption, CouponRecord } from "@/types/coupon";
import styles from "./coupon-admin.module.css";
const fresh = (): CouponConfig => ({ code: "", name: "", status: "draft", kind: "fixed_discount", value: 0, cap_vnd: null,
  minimum_vnd: 0, limit: 1, start_date: "", end_date: "", departure_start: null, departure_end: null, scopes: [] });
const tupleKey = (s: CouponConfig["scopes"][number]) => `${s.route_id}:${s.direction}:${s.vehicle_id}:${s.package_key}`;
const statuses = { draft: "Bản nháp", active: "Hoạt động", paused: "Tạm dừng" };
function statusLabel(config: CouponConfig) {
  if (config.status !== "active") return statuses[config.status];
  const now = Date.now(), from = Date.parse(`${config.start_date}T00:00:00+07:00`), until = Date.parse(`${config.end_date}T00:00:00+07:00`) + 86400000;
  return now < from ? "Chưa đến thời gian áp dụng" : now >= until ? "Đã hết hạn" : "Hoạt động";
}
export function CouponAdmin({ csrf }: { csrf: string }) {
  const [items, setItems] = useState<CouponRecord[]>([]);
  const [options, setOptions] = useState<CouponOption[]>([]);
  const [config, setConfig] = useState<CouponConfig>(fresh);
  const [record, setRecord] = useState<CouponRecord | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([fetch("/api/admin/coupons", { cache: "no-store" }), fetch("/api/admin/coupons/options", { cache: "no-store" })])
      .then(async ([list, choice]) => {
        const [a, b] = await Promise.all([list.json(), choice.json()]);
        if (!list.ok || !choice.ok) throw new Error(a.message || b.message || "Không tải được danh sách mã.");
        if (live) { setItems(a.items); setOptions(b.options); setEnabled(a.commercial_enabled === true); setHasMore(a.has_more === true); }
      }).catch(error => { if (live) setMessage(error.message || "Không tải được dữ liệu."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  function edit(item: CouponRecord | null) {
    setRecord(item); setConfig(item ? structuredClone(item.config) : fresh()); setMessage(""); setSuccess("");
  }
  function field<K extends keyof CouponConfig>(key: K, value: CouponConfig[K]) { setConfig(old => ({ ...old, [key]: value })); setSuccess(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || loading) return;
    setPending(true); setMessage(""); setSuccess("");
    try {
      const response = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json", "x-gocar-csrf": csrf },
        body: JSON.stringify({ config, expected_revision: record?.revision || 0 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Không lưu được mã.");
      setRecord(result); setConfig(result.config); setItems(old => [result, ...old.filter(i => i.id !== result.id)]);
      setSuccess("Đã lưu mã khuyến mãi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa lưu được mã."); }
    finally { setPending(false); }
  }
  const selected = new Set(config.scopes.map(tupleKey));
  const visibleOptions = [...options, ...config.scopes.filter(s => !options.some(o => o.key === tupleKey(s))).map(s => ({ key: tupleKey(s), scope: s, label: `Tổ hợp ${tupleKey(s)} (không còn đủ điều kiện)` }))];
  return <main className={styles.main}>
    <Link href="/bang-gia">Về bảng giá</Link><h1>Quản lý mã khuyến mãi</h1>
    <p className={styles.notice}>{enabled ? "Khách có thể áp dụng các mã đang hoạt động và đủ điều kiện." : "Tính năng giảm giá cho khách đang tắt. Có thể chuẩn bị mã; việc lưu mã không tự mở tính năng."}</p>
    {loading && <p role="status">Đang tải...</p>}
    <div className={styles.layout}><aside className={styles.panel}>
      <button type="button" onClick={() => edit(null)} disabled={pending || loading}>Tạo mã mới</button>
      <div className={styles.list}>{items.map(item => <button key={item.id} type="button" onClick={() => edit(item)} disabled={pending} aria-pressed={record?.id === item.id}>
        <strong>{item.config.code}</strong><span>{statusLabel(item.config)}</span><small>Đã dùng: {item.used}/{item.config.limit} · Đang xử lý: {item.held}</small>
      </button>)}</div>{hasMore && <p>Đang hiển thị 100 mã mới nhất.</p>}
    </aside><section className={styles.panel}><h2>{record ? `Sửa mã ${record.config.code}` : "Tạo mã khuyến mãi"}</h2>
      <form onSubmit={save}><fieldset disabled={pending || loading} className={styles.fields}>
        <label>Mã khuyến mãi<input required pattern={"[A-Za-z0-9][A-Za-z0-9_\\-]{2,63}"} maxLength={64} value={config.code} readOnly={!!record} onChange={e => field("code", e.target.value.toUpperCase())} autoCapitalize="characters" /></label>
        <label>Tên chương trình<input required maxLength={150} value={config.name} onChange={e => field("name", e.target.value)} /></label>
        <label>Trạng thái<select value={config.status} onChange={e => field("status", e.target.value as CouponConfig["status"])}><option value="draft">Bản nháp</option><option value="active">Hoạt động</option><option value="paused">Tạm dừng</option></select></label>
        <label>Cách giảm<select value={config.kind} onChange={e => setConfig(old => ({ ...old, kind: e.target.value as CouponConfig["kind"], value: 0, cap_vnd: e.target.value === "percent_discount" ? 0 : null }))}><option value="fixed_discount">Giảm số tiền cố định</option><option value="percent_discount">Giảm theo phần trăm</option></select></label>
        <label>{config.kind === "fixed_discount" ? "Số tiền giảm (đồng)" : "Tỷ lệ giảm (%)"}<input required type="number" min={config.kind === "fixed_discount" ? 1 : 0.01} max={config.kind === "fixed_discount" ? 1000000000000 : 99.99} step={config.kind === "fixed_discount" ? 1 : 0.01} value={config.value ? config.kind === "fixed_discount" ? config.value : config.value / 100 : ""} onChange={e => field("value", config.kind === "fixed_discount" ? Number(e.target.value) : Math.round(Number(e.target.value) * 100))} /></label>
        {config.kind === "percent_discount" && <label>Giảm tối đa (đồng)<input required type="number" min={1} max={1000000000000} step={1} value={config.cap_vnd || ""} onChange={e => field("cap_vnd", Number(e.target.value))} /></label>}
        <label>Giá chuyến cơ bản tối thiểu (đồng)<input required type="number" min={1} max={1000000000000} step={1} value={config.minimum_vnd || ""} onChange={e => field("minimum_vnd", Number(e.target.value))} /></label>
        <label>Tổng lượt sử dụng<input required type="number" min={1} max={10000} step={1} value={config.limit} onChange={e => field("limit", Number(e.target.value))} /></label>
        <label>Nhận đặt xe từ ngày<input required type="date" value={config.start_date} onChange={e => field("start_date", e.target.value)} /></label>
        <label>Nhận đặt xe đến hết ngày<input required type="date" min={config.start_date} value={config.end_date} onChange={e => field("end_date", e.target.value)} /></label>
        <label>Ngày đi từ (không bắt buộc)<input type="date" required={!!config.departure_end} value={config.departure_start || ""} onChange={e => field("departure_start", e.target.value || null)} /></label>
        <label>Ngày đi đến (không bắt buộc)<input type="date" min={config.departure_start || undefined} required={!!config.departure_start} value={config.departure_end || ""} onChange={e => field("departure_end", e.target.value || null)} /></label>
        <p className={styles.wide}>Thời hạn theo giờ Việt Nam. Mã chỉ giảm trên giá chuyến cơ bản; phụ phí tính riêng. Mỗi đơn một mã, không cộng dồn ưu đãi.</p>
        <fieldset className={`${styles.wide} ${styles.scopes}`}><legend>Chọn chuyến được áp dụng ({config.scopes.length})</legend>
          {visibleOptions.length ? visibleOptions.map(option => <label key={option.key}><input type="checkbox" checked={selected.has(option.key)} onChange={e => field("scopes", e.target.checked ? [...config.scopes, option.scope] : config.scopes.filter(s => tupleKey(s) !== option.key))} />{option.label}</label>) : <p>Chưa có tổ hợp chuyến đủ điều kiện. Cần xác nhận dữ liệu tuyến, chiều, xe và gói trước khi tạo mã.</p>}
        </fieldset>
      </fieldset>
      {message && <p role="alert" className={styles.error}>{message}</p>}{success && <p role="status" className={styles.success}>{success}</p>}
      <button className={styles.primary} disabled={pending || loading} type="submit">{pending ? "Đang lưu..." : "Lưu mã khuyến mãi"}</button>
      </form>
      {record && <><h2 className={styles.historyTitle}>Lịch sử và lượt sử dụng</h2><p>Đã dùng {record.used} lượt. Đang xử lý {record.held} lượt. Hủy đơn không tự hoàn lượt mã.</p>
        {record.held > 0 && <p>Lượt đang xử lý được giữ để tránh cấp vượt hạn mức. Cần đối chiếu yêu cầu đã lưu trước khi giải phóng; không tự hết hạn lượt này.</p>}
        <ol>{record.history.slice(-10).reverse().map(h => <li key={h.revision}>Phiên bản {h.revision} · {new Date(h.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Quản trị viên #{h.actor} · {statuses[h.after.status]}</li>)}</ol></>}
    </section></div>
  </main>;
}
