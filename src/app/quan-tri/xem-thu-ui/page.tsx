import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Xem thử giao diện điện thoại", robots: { index: false, follow: false, noarchive: true } };
const screens = { home: { name: "Trang chủ", path: "/" }, catalog: { name: "Danh sách tuyến", path: "/tuyen-duong" }, route: { name: "Tuyến Sài Gòn đi Vũng Tàu", path: "/tuyen-duong/ba-ria-vung-tau/tp-hcm-vung-tau" } };

/** Preview-only narrow iframe: actual pages and media queries, no altered product DOM. */
export default async function MobileUiPreview({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (process.env.VERCEL_ENV !== "preview") notFound();
  const screen = (await searchParams).screen;
  const selected = screen === "catalog" || screen === "route" ? screen : "home";
  return <main style={{ padding: "16px", background: "#f0f5ff", minHeight: "100vh" }}>
    <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>Xem thử giao diện điện thoại</h1>
    <p style={{ marginBottom: "12px" }}>Khung hiển thị rộng 390 pixel, dùng chính trang trong bản xem thử.</p>
    <nav aria-label="Chọn trang xem thử điện thoại" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>{Object.entries(screens).map(([key, item]) => <Link key={key} href={`?screen=${key}`} aria-current={key === selected ? "page" : undefined} style={{ padding: "8px 12px", borderRadius: "6px", background: key === selected ? "#0000d8" : "#fff", color: key === selected ? "#fff" : "#0000d8" }}>{item.name}</Link>)}</nav>
    <iframe title={screens[selected].name} src={screens[selected].path} style={{ display: "block", width: "390px", maxWidth: "100%", height: "900px", border: "1px solid #cad7fa", background: "#fff", borderRadius: "10px" }} />
  </main>;
}
