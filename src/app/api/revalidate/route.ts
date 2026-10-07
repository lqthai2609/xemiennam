import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { WP_CACHE_TAG } from "@/lib/wp";

// WordPress sends at shutdown after post fields, meta and terms are committed.
// PHP source: wordpress/snippets/frontend-sync.php. No secret defaults are accepted.
const RESOURCES: Record<string, string[]> = {
  route: ["route"], vehicle: ["vehicle", "media"], location: ["location"],
  diem_den: ["diem-den"], dich_vu: ["dich_vu"], promotion: ["promotion"],
  testimonial: ["testimonial"], post: ["posts"],
  attachment: ["media", "route", "vehicle", "posts", "diem-den"],
  taxonomy: [], // Embedded terms can appear in any WordPress collection.
};
const ROUTE_PAGES = [
  "/tuyen-duong/[tinh]", "/tuyen-duong/[tinh]/[tuyen]",
  "/tuyen-duong/[tinh]/[tuyen]/[loai-xe]", "/san-bay/[airportSlug]",
];
const PAGES: Record<string, string[]> = {
  route: ROUTE_PAGES, vehicle: [...ROUTE_PAGES, "/loai-xe/[slug]"],
  location: ROUTE_PAGES, diem_den: ["/tuyen-duong/[tinh]"],
  dich_vu: ["/dich-vu/[slug]"], post: ["/blog/[slug]"],
};
const LISTINGS: Record<string, string[]> = {
  route: ["/", "/tuyen-duong", "/bang-gia", "/diem-den"],
  vehicle: ["/", "/loai-xe", "/bang-gia", "/tuyen-duong"],
  location: ["/", "/tuyen-duong", "/bang-gia", "/diem-den"],
  diem_den: ["/diem-den", "/tuyen-duong"], dich_vu: ["/dich-vu"],
  promotion: ["/khuyen-mai"], testimonial: ["/danh-gia"], post: ["/", "/blog"],
};

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch {
    return NextResponse.json({ revalidated: false, error: "Body không phải JSON hợp lệ." }, { status: 400 });
  }
  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (!expectedSecret || expectedSecret === "THAY-SECRET-NAY") {
    return NextResponse.json({ revalidated: false, error: "Server chưa cấu hình khóa riêng." }, { status: 503 });
  }
  const payload = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown> : {};
  const supplied = typeof payload.secret === "string" ? Buffer.from(payload.secret) : Buffer.alloc(0);
  const expected = Buffer.from(expectedSecret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ revalidated: false, error: "Khóa kết nối không đúng." }, { status: 401 });
  }
  const postType = typeof payload.post_type === "string" ? payload.post_type : "";
  if (!Object.hasOwn(RESOURCES, postType)) {
    return NextResponse.json({ revalidated: false, error: "Loại dữ liệu không được hỗ trợ." }, { status: 400 });
  }
  const tags = postType === "taxonomy" ? [WP_CACHE_TAG]
    : RESOURCES[postType].map((resource) => `${WP_CACHE_TAG}:${resource}`);
  // Prices expire immediately; 'max' would serve one stale response first.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  for (const path of PAGES[postType] ?? []) revalidatePath(path, "page");
  for (const path of LISTINGS[postType] ?? []) revalidatePath(path);
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ revalidated: true, postType, tags, now: Date.now() });
}

export async function GET() {
  return NextResponse.json({ ok: true, version: 2, message: "POST từ WordPress làm mới dữ liệu; GET chỉ kiểm tra kết nối." });
}
