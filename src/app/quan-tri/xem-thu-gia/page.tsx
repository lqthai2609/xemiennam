import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { decodePreviewState, pricingPreviewRoute, PRICING_PREVIEW_COOKIE } from "@/lib/inline-pricing-preview";
import { PricingPreview } from "./pricing-preview";
import "../../bang-gia/pricing-redesign.css";
import "../../home-redesign.css";
import "../../route-vehicle-picker.css";
import "../../tuyen-duong/[tinh]/[tuyen]/route-detail-redesign.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Xem thử sửa giá — dữ liệu giả", robots: { index: false, follow: false, noarchive: true } };
export default async function PricingPreviewPage() {
  if (!(process.env.VERCEL_ENV === "preview" || (process.env.NODE_ENV === "development" && process.env.ALO_PRICING_PREVIEW === "true"))) notFound();
  const state = decodePreviewState((await cookies()).get(PRICING_PREVIEW_COOKIE)?.value);
  return <PricingPreview route={pricingPreviewRoute(state.changes)} />;
}
