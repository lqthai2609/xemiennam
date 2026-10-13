import { NextRequest, NextResponse } from "next/server";
import { decodePreviewState, pricingPreviewRoute, previewRowKey, PRICING_PREVIEW_COOKIE } from "@/lib/inline-pricing-preview";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
function enabled() { return process.env.VERCEL_ENV === "preview" || (process.env.NODE_ENV === "development" && process.env.ALO_PRICING_PREVIEW === "true"); }

export async function GET(request: NextRequest, context: Context) {
  if (!enabled()) return reply({ message: "Không tìm thấy." }, 404);
  const path = (await context.params).path.join("/");
  if (path === "session") {
    const admin = request.nextUrl.searchParams.get("viewer") === "admin";
    return reply({ authenticated: admin, csrf: "synthetic-preview-only", session: { canEditPricing: admin } });
  }
  if (path !== "routes/1001/pricing") return reply({ message: "Không tìm thấy." }, 404);
  const state = decodePreviewState(request.cookies.get(PRICING_PREVIEW_COOKIE)?.value);
  const pricing = pricingPreviewRoute(state.changes).pricingV2!;
  return reply({ locked: false, backendVersion: String(state.revision), pricingRows: [...pricing.outbound.packages, ...pricing.inbound.packages] });
}

export async function POST(request: NextRequest, context: Context) {
  if (!enabled() || (await context.params).path.join("/") !== "routes/1001/pricing") return reply({ message: "Không tìm thấy." }, 404);
  if (request.headers.get("origin") !== request.nextUrl.origin || request.headers.get("x-gocar-csrf") !== "synthetic-preview-only") return reply({ message: "Yêu cầu thử nghiệm không hợp lệ." }, 403);
  const data = await request.json().catch(() => null);
  const state = decodePreviewState(request.cookies.get(PRICING_PREVIEW_COOKIE)?.value);
  const pricing = pricingPreviewRoute().pricingV2!;
  const row = [...pricing.outbound.packages, ...pricing.inbound.packages].find(row => row.direction === data?.pricingDirection && row.vehicleId === String(data?.vehicleId) && row.packageKey === data?.packageKey);
  if (!row || !["fixed", "contact"].includes(data.priceMode) || (data.priceMode === "fixed" && (!Number.isSafeInteger(data.priceAmount) || data.priceAmount <= 0))) return reply({ message: "Giá thử nghiệm không hợp lệ." }, 422);
  if (data.baseVersion !== String(state.revision)) return reply({ message: "Dữ liệu thử đã thay đổi. Bấm Hủy rồi mở Sửa lại." }, 409);
  state.changes[previewRowKey(row)] = data.priceMode === "fixed" ? { mode: "fixed", price: data.priceAmount } : { mode: "contact" };
  state.revision += 1;
  const response = reply({ routeId: "1001", demo: true, message: "Đã lưu giá mô phỏng." });
  response.cookies.set(PRICING_PREVIEW_COOKIE, Buffer.from(JSON.stringify(state)).toString("base64url"), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 3600 });
  return response;
}
