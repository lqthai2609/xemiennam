import type { Metadata } from "next";
import { getAdminSession } from "@/lib/admin-session";
import { AdminLogin } from "../admin-login";
import { CouponAdmin } from "./coupon-admin";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quản lý mã khuyến mãi", robots: { index: false, follow: false, noarchive: true } };
export default async function CouponAdminPage() {
  const auth = await getAdminSession();
  if (!auth) return <AdminLogin />;
  if (!auth.session.canEditPricing) return <main className="container py-12"><h1>Chỉ quản trị viên được quản lý mã khuyến mãi.</h1></main>;
  return <CouponAdmin csrf={auth.csrf} />;
}
