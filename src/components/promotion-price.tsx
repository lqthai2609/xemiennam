"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { PromotionPriceView } from "@/types/promotion-price";
import { promotionLeaseSnapshot, watchPromotionExpiry } from "@/lib/promotion-expiry";

export function usePromotionLease(expiresAt?: string): boolean {
  const subscribe = useCallback((notify: () => void) => {
    if (!expiresAt) return () => {};
    return watchPromotionExpiry(expiresAt, notify, {
      now: Date.now, setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (timer) => { if (typeof timer === "number") window.clearTimeout(timer); },
      listen: (fn) => {
        window.addEventListener("pageshow", fn); window.addEventListener("focus", fn);
        document.addEventListener("visibilitychange", fn);
        return () => { window.removeEventListener("pageshow", fn); window.removeEventListener("focus", fn); document.removeEventListener("visibilitychange", fn); };
      },
    });
  }, [expiresAt]);
  const snapshot = useMemo(() => promotionLeaseSnapshot(expiresAt, Date.now), [expiresAt]);
  return useSyncExternalStore(subscribe, snapshot, () => Boolean(expiresAt));
}
const amountLabel = (n: number) => `${n.toLocaleString("vi-VN")} đồng`;
const dateLabel = (date: string) => date.split("-").reverse().join("/");

export function PromotionPrice({ view }: { view: PromotionPriceView }) {
  const active = usePromotionLease(view.claim?.expiresAt);
  const claim = active ? view.claim : undefined;
  return <div className="promotion-price" data-promotion-state={view.claim && !active ? "expired" : view.state} aria-live="polite">
    {view.mode === "disabled" ? <strong>Chưa nhận đặt chuyến</strong> : view.mode === "contact" ? <strong>Liên hệ báo giá</strong> : <>
      {claim && !claim.benefit ? <div className="promotion-price-comparison"><small>{claim.layerLabel}</small><span><del aria-label="Giá trước ưu đãi">{amountLabel(claim.before!)}</del> <strong aria-label="Giá sau ưu đãi">{amountLabel(claim.after!)}</strong></span></div> : <strong>{amountLabel(view.originalAmount!)}</strong>}
      {view.purpose === "trip_estimate" && claim && claim.layer !== "estimated_total" ? <p>Tổng chuyến dự kiến: <strong>{amountLabel(view.amount!)}</strong></p> : null}
      {claim?.benefit ? <p><strong>{claim.benefit.title}</strong><br />{claim.benefit.rule}</p> : null}
      {claim ? <><p>Áp dụng từ {dateLabel(claim.startDate)} đến hết {dateLabel(claim.endDate)} (giờ Việt Nam).</p>{claim.conditions.length ? <ul>{claim.conditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul> : null}<small>Giá và điều kiện được xác nhận lại khi đặt chuyến.</small></> : null}
    </>}
    {!claim && (view.claim || view.message) ? <p>{view.claim ? "Ưu đãi cần được kiểm tra lại. Hiện hiển thị giá chưa giảm." : view.message}</p> : null}
  </div>;
}
