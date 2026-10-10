import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { AdminLogin } from "../admin-login";
import { EmptyLegAdmin } from "./empty-leg-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Điều phối chuyến chiều trống", robots: { index: false, follow: false, noarchive: true } };
export default async function EmptyLegAdminPage() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview" && process.env.GOCAR_ADMIN_WIZARD_ENABLED !== "true") notFound();
  const auth = await getAdminSession();
  if (!auth) return <AdminLogin />;
  return <EmptyLegAdmin csrf={auth.csrf} canPublish={auth.session.canPublish} />;
}
