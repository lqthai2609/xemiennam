"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseEmptyLegPresentation, presentationTick, visibleEmptyLegCards, type EmptyLegCard } from "@/lib/empty-leg-presentation";
import styles from "./preview.module.css";
import { getPublicLocationLabel } from "@/lib/public-location-label";

const money = (value: number) => `${value.toLocaleString("vi-VN")} đồng`;
const vietnamDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export function EmptyLegPreview() {
  const [cards, setCards] = useState<EmptyLegCard[]>([]);
  const [message, setMessage] = useState("Đang kiểm tra chuyến từ máy chủ.");
  useEffect(() => {
    let disposed = false, generation = 0;
    let controller: AbortController | null = null;
    let poll: ReturnType<typeof setTimeout> | undefined, tick: ReturnType<typeof setTimeout> | undefined;
    function reset() { generation++; controller?.abort(); clearTimeout(poll); clearTimeout(tick); setCards([]); }
    async function refresh() {
      const current = ++generation;
      clearTimeout(tick); setCards([]);
      setMessage("Đang kiểm tra chuyến từ máy chủ.");
      controller?.abort(); controller = new AbortController();
      const active = controller;
      const started = performance.now();
      const timeout = setTimeout(() => active.abort(), 8000);
      try {
        const response = await fetch("/api/admin/empty-legs/presentation", { cache: "no-store", signal: active.signal });
        if (!response.ok) throw new Error("unavailable");
        const data = parseEmptyLegPresentation(await response.json());
        if (!data) throw new Error("invalid");
        if (disposed || current !== generation || document.hidden) return;
        clearTimeout(tick);
        function update() {
          if (disposed || current !== generation || document.hidden) return;
          const now = performance.now();
          const visible = visibleEmptyLegCards(data!, started, now);
          setCards(visible);
          setMessage(visible.length ? "" : "Chưa có chuyến đã xác nhận còn hiệu lực để hiển thị.");
          if (now - started < data!.lease_ms) tick = setTimeout(update, presentationTick(data!, started, now));
        }
        update();
      } catch {
        if (!disposed && current === generation) { clearTimeout(tick); setCards([]); setMessage("Chưa xác minh được chuyến hiện hành. Dữ liệu cũ đã được ẩn."); }
      } finally {
        clearTimeout(timeout);
        if (!disposed && current === generation && !document.hidden) poll = setTimeout(() => void refresh(), 10000);
      }
    }
    function visibility() { reset(); if (!document.hidden) void refresh(); }
    function offline() { reset(); setMessage("Mất kết nối. Dữ liệu chuyến đã được ẩn."); }
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", visibility);
    window.addEventListener("offline", offline);
    window.addEventListener("online", visibility);
    void refresh();
    return () => { disposed = true; controller?.abort(); clearTimeout(poll); clearTimeout(tick); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pageshow", visibility); window.removeEventListener("offline", offline); window.removeEventListener("online", visibility); };
  }, []);
  return <main className={styles.main}>
    <Link href="/quan-tri/chieu-trong">Trở về điều phối</Link>
    <p className={styles.note}>Bản xem nội bộ · Chưa mở bán</p>
    <h1>Chuyến xe chiều trống</h1>
    <p>Giá riêng chỉ áp dụng cho chuyến, chiều và giờ khởi hành được ghi dưới đây.</p>
    {message && <p role="status" className={styles.empty}>{message}</p>}
    <div className={styles.grid}>{cards.map((card) => <article key={card.id} className={styles.card} aria-label={`Chuyến ${card.id}`}>
      <p className={styles.badge}>Chuyến chiều trống · Một chiều</p>
      <h2>{getPublicLocationLabel(card.origin)} → {getPublicLocationLabel(card.destination)}</h2>
      <p>{card.vehicle}</p>
      <dl><dt>Khởi hành (giờ Việt Nam)</dt><dd>{vietnamDate(`${card.departure.date}T${card.departure.time}:00+07:00`)}</dd>
        <dt>Giá nền cùng tuyến, chiều, xe và gói</dt><dd>{money(card.normal_price_vnd)}</dd>
        <dt>Giá riêng của chuyến này</dt><dd className={styles.price}>{money(card.special_price_vnd)}</dd>
        <dt>Hiệu lực đến (giờ Việt Nam)</dt><dd>{vietnamDate(card.expires_at)}</dd></dl>
      <p className={styles.small}>Giá cho gói một chiều, chưa phải tổng tiền sau các khoản phát sinh. Không cộng thêm ưu đãi.</p>
      <p className={styles.small}>Mã chuyến {card.id} · Đặt xe chưa được kích hoạt.</p>
    </article>)}</div>
  </main>;
}
