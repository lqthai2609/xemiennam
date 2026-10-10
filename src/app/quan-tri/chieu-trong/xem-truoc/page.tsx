import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { AdminLogin } from "../../admin-login";
import { EmptyLegPreview } from "./preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Xem trước chuyến chiều trống", robots: { index: false, follow: false, noarchive: true } };
export default async function EmptyLegPreviewPage() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview" && process.env.GOCAR_ADMIN_WIZARD_ENABLED !== "true") notFound();
  if (!await getAdminSession()) return <AdminLogin />;
  return <EmptyLegPreview />;
}
