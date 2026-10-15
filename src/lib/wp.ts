/**
 * Lớp fetch cơ sở cho toàn bộ WP REST API (Ngày 12).
 *
 * - WP_API_BASE_URL: đọc từ biến môi trường server-side (không cần NEXT_PUBLIC_
 *   vì mọi lời gọi đều chạy ở Server Component/generateStaticParams, không lộ ra client).
 * - REVALIDATE_SECONDS: mặc định 300s; webhook làm mới ngay khi CMS lưu xong.
 *   Next.js App Router dùng `fetch(url, { next: { revalidate } })` để bật ISR cho
 *   đúng lời gọi đó; không cần khai báo gì thêm ở route segment.
 * - Chỉ 404 được xem là không có dữ liệu. Lỗi kết nối/API phải throw để ISR giữ
 *   trang thành công gần nhất, thay vì lưu một trang rỗng và gây 404 giả.
 */

import { PROMOTION_COMMERCIAL_ENABLED } from "./api/promotion-model";

export const WP_API_BASE =
  process.env.WP_API_BASE_URL ?? "https://xemiennam.datxesaigon.com/wp-json/wp/v2";

const configuredRevalidate = Number(process.env.WP_REVALIDATE_SECONDS ?? 300);
export const REVALIDATE_SECONDS = Number.isFinite(configuredRevalidate) && configuredRevalidate > 0
  ? configuredRevalidate
  : 300;

export const WP_CACHE_TAG = "alo-wp-v2";
export const WP_ROUTE_CACHE_TAG = `${WP_CACHE_TAG}:route`;
export const WP_ROUTE_LIST_CACHE_TAG = `${WP_ROUTE_CACHE_TAG}:list`;

/** WordPress slugs are at most 200 characters; retain a safe broad fallback. */
export function wpRouteSlugCacheTag(slug: string): string {
  return slug.length <= 200 ? `${WP_ROUTE_CACHE_TAG}:slug:${slug}` : WP_ROUTE_CACHE_TAG;
}

/** List, detail, pagination and embedded terms share the same resource tag. */
export function wpCacheTags(path: string): string[] {
  const resource = path.split(/[/?]/).filter(Boolean)[0];
  const tags = resource ? [WP_CACHE_TAG, `${WP_CACHE_TAG}:${resource}`] : [WP_CACHE_TAG];
  if (resource === "route") {
    const url = new URL(path, "https://cache-key.invalid");
    const slugs = url.searchParams.getAll("slug");
    // Current public detail requests use one slug. Collections and any ambiguous
    // query keep the list tag so price-bearing lists cannot silently go stale.
    if (url.pathname === "/route" && slugs.length === 1 && slugs[0] && !slugs[0].includes(",")) {
      tags.push(wpRouteSlugCacheTag(slugs[0]));
    } else {
      tags.push(WP_ROUTE_LIST_CACHE_TAG);
    }
  }
  return tags;
}

export async function wpFetch<T>(
  path: string,
  revalidate: number = REVALIDATE_SECONDS,
): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(`${WP_API_BASE}${path}`, {
        ...(PROMOTION_COMMERCIAL_ENABLED ? { cache: "no-store" as const } : { next: { revalidate, tags: wpCacheTags(path) } }),
        // A different retry header prevents React request memoization from
        // replaying the first failed response, while retaining normal ISR.
        headers: {
          Accept: "application/json",
          // Replace untagged pre-Day41 entries with a fresh cache identity on rollout.
          // Route-only migration ensures persistent entries acquire the new
          // list/detail tags. Other WordPress resources retain their cache keys.
          "X-Alo-Dat-Xe-Cache-Version": path.split(/[/?]/).filter(Boolean)[0] === "route" ? "3" : "2",
          ...(attempt > 0 ? { "X-Alo-Dat-Xe-Retry": "1" } : {}),
        },
      });
    } catch (cause) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw new Error(`[wpFetch] ${path}: không kết nối được WordPress`, { cause });
    }

    if (res.status === 404) return null;
    if (!res.ok) {
      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw new Error(`[wpFetch] ${path}: HTTP ${res.status}`);
    }
    try {
      return (await res.json()) as T;
    } catch (cause) {
      throw new Error(`[wpFetch] ${path}: phản hồi WordPress không phải JSON hợp lệ`, { cause });
    }
  }
  throw new Error(`[wpFetch] ${path}: không lấy được dữ liệu WordPress`);
}

// Preserve the existing server API while keeping presentation imports lightweight.
export { decodeHtmlEntities, stripHtml, parsePriceAmount, formatPriceShort, splitCommaList, formatVNDate, formatCurrencyVN, parseFaqItems } from "./wp-format";
