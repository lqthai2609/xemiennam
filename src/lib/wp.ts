/**
 * Lớp fetch cơ sở cho toàn bộ WP REST API (Ngày 12).
 *
 * - WP_API_BASE_URL: đọc từ biến môi trường server-side (không cần NEXT_PUBLIC_
 *   vì mọi lời gọi đều chạy ở Server Component/generateStaticParams, không lộ ra client).
 * - REVALIDATE_SECONDS: mặc định 3600s (1h) — nằm trong khoảng 1–6h theo kế hoạch.
 *   Next.js App Router dùng `fetch(url, { next: { revalidate } })` để bật ISR cho
 *   đúng lời gọi đó; không cần khai báo gì thêm ở route segment.
 * - wpFetch không throw ra ngoài: nếu API lỗi/timeout, trả về null và log lỗi,
 *   để lớp gọi (routes.ts/vehicles.ts) tự quyết định fallback (xem ghi chú ở đó).
 */

export const WP_API_BASE =
  process.env.WP_API_BASE_URL ?? "https://xemiennam.datxesaigon.com/wp-json/wp/v2";

export const REVALIDATE_SECONDS = Number(process.env.WP_REVALIDATE_SECONDS ?? 3600);

export async function wpFetch<T>(
  path: string,
  revalidate: number = REVALIDATE_SECONDS,
): Promise<T | null> {
  try {
    const res = await fetch(`${WP_API_BASE}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[wpFetch] ${path} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[wpFetch] ${path} → lỗi khi gọi WP REST API`, err);
    return null;
  }
}

/** Bỏ thẻ HTML thô trong content.rendered (WordPress trả về HTML, ta cần plain text cho description/summary). */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Format số tiền thô (vd 140000) thành nhãn ngắn kiểu mock hiện có (vd "140K"). */
export function formatPriceShort(amount: number | string | undefined | null): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!n || Number.isNaN(n)) return "";
  if (n >= 1_000_000) {
    const millions = n / 1_000_000;
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}.000K`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

/** Tách chuỗi "A, B, C" (meta kiểu textarea/text nhập tay) thành mảng, bỏ khoảng trắng thừa và phần tử rỗng. */
export function splitCommaList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
