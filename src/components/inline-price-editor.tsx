"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { RoutePricingPackage } from "@/types/route";
import styles from "./inline-price-editor.module.css";

type PricingAuth = { csrf: string; endpointBase: string; revoke: () => void } | null;
const PricingAuthContext = createContext<PricingAuth>(null);

/** The public server-rendered layout remains cacheable and contains no admin controls. */
export function PricingEditProvider({ children, enabled = true, previewViewer }: { children: ReactNode; enabled?: boolean; previewViewer?: "admin" | "guest" }) {
  const [csrf, setCsrf] = useState<string | null>(null);
  const endpointBase = previewViewer ? "/api/preview/pricing" : "/api/admin";
  const sessionEndpoint = `${endpointBase}/session${previewViewer ? `?viewer=${previewViewer}` : ""}`;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let generation = 0;
    async function checkSession() {
      const current = ++generation;
      try {
        const response = await fetch(sessionEndpoint, { cache: "no-store", credentials: "same-origin" });
        const data = await response.json();
        if (active && current === generation) {
          setCsrf(response.ok && data.authenticated === true && data.session?.canEditPricing === true && typeof data.csrf === "string" ? data.csrf : null);
        }
      } catch {
        if (active && current === generation) setCsrf(null);
      }
    }
    void checkSession();
    window.addEventListener("focus", checkSession);
    return () => { active = false; window.removeEventListener("focus", checkSession); };
  }, [enabled, sessionEndpoint]);
  return <PricingAuthContext.Provider value={enabled && csrf ? { csrf, endpointBase, revoke: () => setCsrf(null) } : null}>{children}</PricingAuthContext.Provider>;
}

type PricingRow = Pick<RoutePricingPackage, "direction" | "vehicleId" | "packageKey" | "mode" | "price">;
type CurrentPricing = { backendVersion: string; pricingRows: PricingRow[]; locked: boolean };
type EditState = { version: string; mode: "fixed" | "contact"; amount: string; before: string };

function amountLabel(row: Pick<PricingRow, "mode" | "price">) {
  return row.mode === "fixed" && row.price ? `${row.price.toLocaleString("vi-VN")} đồng` : "Liên hệ báo giá";
}

export function InlinePriceEditor({ routeId, row, routeLabel, children }: { routeId: string; row: RoutePricingPackage; routeLabel: string; children: ReactNode }) {
  const auth = useContext(PricingAuthContext);
  const router = useRouter();
  const id = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const contextLabel = `${routeLabel}, xe ${row.vehicleType}, ${row.packageLabel}`;
  const endpoint = `${auth?.endpointBase ?? "/api/admin"}/routes/${routeId}/pricing`;
  const pending = busy || refreshing;

  async function open() {
    if (!auth || pending) return;
    setBusy(true); setMessage(""); setSaved(false);
    try {
      const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin" });
      const data = await response.json();
      if (response.status === 401) auth.revoke();
      if (!response.ok) throw new Error(data.message || "Không thể đọc giá hiện tại.");
      const current = data as CurrentPricing;
      const matches = current.pricingRows.filter((item) => item.direction === row.direction && item.vehicleId === row.vehicleId && item.packageKey === row.packageKey);
      const price = matches[0];
      if (current.locked || !current.backendVersion || matches.length !== 1 || !price || !["fixed", "contact"].includes(price.mode)) {
        throw new Error("Giá không còn khả dụng. Hãy tải lại trang.");
      }
      setEdit({ version: current.backendVersion, mode: price.mode as "fixed" | "contact", amount: price.mode === "fixed" && price.price ? String(price.price) : "", before: amountLabel(price) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc giá hiện tại.");
    } finally { setBusy(false); }
  }

  function cancel() { setEdit(null); setMessage(""); editButton.current?.focus(); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit || !auth || pending) return;
    // VND: integer amount, optionally grouped by thousands. Never silently remove a sign/decimal.
    const text = edit.amount.trim();
    const validFormat = /^(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+)$/.test(text);
    const amount = Number(text.replace(/[., ]/g, ""));
    if (edit.mode === "fixed" && (!validFormat || !Number.isSafeInteger(amount) || amount <= 0)) {
      setMessage("Nhập số tiền nguyên dương, ví dụ 1.500.000, hoặc chọn Liên hệ báo giá."); return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Gocar-Csrf": auth.csrf },
        body: JSON.stringify({ pricingDirection: row.direction, vehicleId: Number(row.vehicleId), packageKey: row.packageKey, priceMode: edit.mode, priceAmount: edit.mode === "fixed" ? amount : null, baseVersion: edit.version, reason: `Sửa giá trực tiếp: ${contextLabel}. Giá trước: ${edit.before}.` }),
      });
      const data = await response.json();
      if (response.status === 401) auth.revoke();
      if (!response.ok) throw new Error(data.data?.errors?.join(" ") || data.message || "Chưa lưu được giá. Hãy thử lại.");
      setEdit(null); setSaved(true); setMessage("Đã lưu giá.");
      startRefresh(() => router.refresh());
      editButton.current?.focus();
    } catch (error) {
      setSaved(false); setMessage(error instanceof Error ? error.message : "Chưa lưu được giá. Hãy kiểm tra kết nối.");
    } finally { setBusy(false); }
  }

  // Logged-out users and non-admin accounts retain the exact original markup.
  if (!auth || row.mode === "disabled" || !/^[1-9]\d*$/.test(routeId) || !/^[1-9]\d*$/.test(row.vehicleId)) return <>{children}</>;

  return <>
    {!edit ? <><span className={styles.display}>{children}<button ref={editButton} type="button" className={styles.editButton} disabled={pending} onClick={() => void open()} aria-label={`Sửa giá ${contextLabel}`}>{pending ? "Đang tải…" : "Sửa"}</button></span>{message && <span className={saved ? styles.saved : styles.error} role={saved ? "status" : "alert"}>{message}</span>}</> :
      <form className={styles.form} aria-label={`Sửa giá ${contextLabel}`} onSubmit={save} onKeyDown={(event) => { if (event.key === "Escape" && !pending) cancel(); }}>
        <span className={styles.context}>{contextLabel}</span>
        <label className="sr-only" htmlFor={`${id}-mode`}>Cách hiển thị giá</label>
        <select id={`${id}-mode`} value={edit.mode} disabled={pending} autoFocus onChange={(event) => { setEdit({ ...edit, mode: event.target.value as "fixed" | "contact" }); setMessage(""); }}>
          <option value="fixed">Giá cụ thể</option><option value="contact">Liên hệ báo giá</option>
        </select>
        {edit.mode === "fixed" && <><label className="sr-only" htmlFor={`${id}-amount`}>Số tiền, đơn vị đồng</label><span className={styles.inputRow}><input id={`${id}-amount`} type="text" inputMode="numeric" value={edit.amount} disabled={pending} onChange={(event) => setEdit({ ...edit, amount: event.target.value })} aria-invalid={message ? true : undefined} aria-describedby={message ? `${id}-error` : undefined} required /><span>đồng</span></span></>}
        <span className={styles.before}>Giá hiện tại: {edit.before}</span>
        <span className={styles.actions}><button type="submit" disabled={pending}>{pending ? "Đang lưu…" : "Lưu"}</button><button type="button" disabled={pending} onClick={cancel}>Hủy</button></span>
        {message && <span id={`${id}-error`} className={styles.error} role="alert">{message}</span>}
      </form>}
  </>;
}
