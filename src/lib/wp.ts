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

/**
 * Giải mã entity trong chuỗi `rendered` của WordPress mà không phụ thuộc DOM (các mapper
 * đều chạy phía server). WordPress mã hóa dấu gạch ngang và ký tự đặc biệt trong tiêu đề,
 * nên nếu đưa chuỗi trực tiếp vào JSX thì người dùng sẽ thấy nguyên văn `&#8211;`.
 */
export function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi, (entity, code: string) => {
    if (!code.startsWith("#")) return namedEntities[code.toLowerCase()] ?? entity;

    const isHex = code[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      return entity;
    }
    return String.fromCodePoint(codePoint);
  });
}

/** Bỏ thẻ HTML thô trong content.rendered (WordPress trả về HTML, ta cần plain text cho description/summary). */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  return decodeHtmlEntities(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chuẩn hóa giá nhập từ WordPress về số nguyên VND.
 * WordPress có thể trả number, chuỗi có dấu chấm/phẩy phân cách hàng nghìn,
 * hoặc chuỗi có hậu tố tiền tệ; không được để Number() biến các giá trị đó thành NaN.
 */
export function parsePriceAmount(amount: number | string | undefined | null): number {
  if (typeof amount === "number") return Number.isFinite(amount) ? Math.round(amount) : 0;
  const raw = String(amount ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\\d.,-]/g, "");
  if (!cleaned) return 0;

  const separatorCount = (cleaned.match(/[.,]/g) ?? []).length;
  const hasBothSeparators = cleaned.includes(".") && cleaned.includes(",");
  let normalized = cleaned;
  if (hasBothSeparators || separatorCount > 1) {
    normalized = cleaned.replace(/[.,]/g, "");
  } else if (/^[+-]?\\d+[.,]\\d{1,2}$/.test(cleaned)) {
    normalized = cleaned.replace(",", ".");
  } else {
    normalized = cleaned.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

/**
 * Format số tiền thô (vd 140000) thành nhãn ngắn kiểu mock hiện có (vd "140K").
 *
 * Sửa lỗi (phát hiện Ngày 24 khi có dữ liệu thật từ 700K đến 7 triệu): nhánh cũ xử lý
 * riêng số ≥ 1 triệu bằng cách chia 1_000_000 rồi GHÉP CỨNG chuỗi ".000K" vào sau, nên
 * 2.500.000 → 2.5 → "2.5" + ".000K" = "2.5.000K" (2 dấu chấm chồng nhau, vô nghĩa).
 * Fix: dùng chung 1 công thức /1000 cho mọi giá trị ≥ 1000 (khớp đúng style "900K" đã
 * đúng từ trước), thêm dấu chấm ngăn cách hàng nghìn kiểu Việt Nam qua toLocaleString.
 */
export function formatPriceShort(amount: number | string | undefined | null): string {
  const n = parsePriceAmount(amount);
  if (!n) return "";
  if (n >= 1000 && n % 1000 === 0) {
    return `${(n / 1000).toLocaleString("vi-VN")}K`;
  }
  if (n >= 1000) return `${n.toLocaleString("vi-VN")}đ`;
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

/** Format ngày ISO (yyyy-mm-dd hoặc datetime WP kiểu post_date) thành dd/mm/yyyy — dùng ở /khuyen-mai và /danh-gia (Ngày 18). */
export function formatVNDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Format số tiền đầy đủ kiểu Việt Nam (vd 300000 → "300.000đ") — khác formatPriceShort (rút gọn "300K"), dùng khi cần nhãn rõ ràng, không viết tắt (vd nhãn giảm giá /khuyen-mai). */
export function formatCurrencyVN(amount: number | string | undefined | null): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!n || Number.isNaN(n)) return "";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

/**
 * Parse field `faq_items` (chuỗi JSON thô "[{\"cau_hoi\":...,\"tra_loi\":...}]") sang mảng
 * {question, answer}. Trả về mảng rỗng thay vì throw nếu JSON hỏng hoặc field trống, để 1 bài
 * nhập liệu sai không làm sập cả trang.
 *
 * Ngày 25: tách ra từ lib/api/blog.ts (nơi field này ra đời — snippet WPCode ID 36, Ngày 23)
 * để dùng chung được với CPT `diem_den` (hub tỉnh, snippet WPCode mới ID 9080) — cùng 1 schema
 * JSON, không có lý do viết lại lần 2. `lib/api/blog.ts` giữ nguyên hành vi, chỉ đổi sang import
 * hàm này thay vì định nghĩa nội bộ.
 */
export function parseFaqItems(raw: string | undefined): { question: string; answer: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        question: typeof item?.cau_hoi === "string" ? item.cau_hoi.trim() : "",
        answer: typeof item?.tra_loi === "string" ? item.tra_loi.trim() : "",
      }))
      .filter((item) => item.question && item.answer);
  } catch {
    console.warn("[parseFaqItems] faq_items không phải JSON hợp lệ — bỏ qua.");
    return [];
  }
}
