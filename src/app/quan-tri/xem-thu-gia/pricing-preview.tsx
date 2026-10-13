"use client";
import { useState } from "react";
import type { Route, RoutePricingDirectionKey } from "@/types/route";
import type { JourneyPackage } from "@/lib/route-package-capability";
import { BangGiaPageClient } from "@/components/bang-gia-page-client";
import { RoutePricingSection } from "@/components/route-pricing-section";

export function PricingPreview({ route }: { route: Route }) {
  const [viewer, setViewer] = useState<"admin" | "guest">("admin");
  const [view, setView] = useState<"table" | "cards">("table");
  const [direction, setDirection] = useState<RoutePricingDirectionKey>("outbound");
  const [journey, setJourney] = useState<JourneyPackage>("oneWay");
  return <>
    <aside style={{ position: "relative", zIndex: 100, padding: "16px", background: "#fff4e8", color: "#07165d", borderBottom: "2px solid #ff5d27" }} aria-label="Điều khiển bản xem thử">
      <p style={{ margin: "0 0 8px" }}><strong>BẢN XEM THỬ — GIÁ GIẢ ĐỊNH</strong><br />Thử Sửa, nhập giá hoặc chọn Liên hệ báo giá, rồi Lưu. Chỉ thay đổi dữ liệu mô phỏng trong trình duyệt này.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <label>Giao diện <select aria-label="Chọn giao diện xem thử" value={view} onChange={e=>setView(e.target.value as "table" | "cards")} style={{ padding: "6px", border: "1px solid #94a3b8", background: "#fff" }}><option value="table">Trang bảng giá</option><option value="cards">Thẻ giá tuyến</option></select></label>
        <label>Người xem mô phỏng <select aria-label="Chọn người xem mô phỏng" value={viewer} onChange={e=>setViewer(e.target.value as "admin" | "guest")} style={{ padding: "6px", border: "1px solid #94a3b8", background: "#fff" }}><option value="admin">Quản trị viên</option><option value="guest">Khách</option></select></label>
      </div>
    </aside>
    {view === "table" ? <BangGiaPageClient routes={[route]} updatedOn="13/10/2026" previewViewer={viewer} /> : <main className="route-detail-redesign" style={{ maxWidth: "1180px", margin: "auto", padding: "24px 16px" }}><h1 style={{ fontSize: "28px" }}>Sài Gòn và Vũng Tàu — thẻ giá mô phỏng</h1><RoutePricingSection route={route} direction={direction} onDirectionChange={setDirection} journey={journey} onJourneyChange={setJourney} redesign previewViewer={viewer} /></main>}
  </>;
}
