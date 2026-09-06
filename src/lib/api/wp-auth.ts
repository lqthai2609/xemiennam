import { WP_API_BASE } from "@/lib/wp";

/**
 * JWT Authentication for WP REST API (Ngày 20) — dùng khi Route Handler cần TẠO/SỬA dữ liệu
 * (hiện tại: booking_request), khác wpFetch() ở lib/wp.ts vốn chỉ đọc (GET) và không cần auth.
 *
 * Plugin "JWT Authentication for WP-API" (đã cài Ngày 2) cấp token qua
 * POST {WP_ORIGIN}/wp-json/jwt-auth/v1/token với { username, password }.
 *
 * Nên tạo 1 user WordPress riêng (role Editor là đủ — booking_request chỉ cần quyền
 * edit_posts/publish_posts mặc định của post type thường, KHÔNG cần Administrator) chỉ để
 * Next.js dùng cho việc này, thay vì dùng tài khoản quản trị cá nhân. Đặt vào biến môi
 * trường WP_JWT_USERNAME / WP_JWT_PASSWORD (xem .env.example).
 */

const WP_ORIGIN = new URL(WP_API_BASE).origin;
const TOKEN_URL = `${WP_ORIGIN}/wp-json/jwt-auth/v1/token`;

type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

// JWT plugin không trả hạn token trong response (token JWT thật có "exp" riêng trong payload,
// mặc định plugin ~7 ngày) — để đơn giản, không tự giải mã JWT, chủ động coi cache hết hạn sau
// 6 giờ rồi xin token mới, an toàn hơn nhiều so với đợi tới khi WordPress từ chối token cũ.
// Lưu ý: cache chỉ tồn tại trong bộ nhớ 1 tiến trình (module-level) — trên Vercel serverless,
// mỗi lần "cold start" sẽ mất cache và xin token mới, đó là hành vi bình thường, không phải lỗi.
const TOKEN_CACHE_MS = 6 * 60 * 60 * 1000;

async function requestNewToken(): Promise<string> {
  const username = process.env.WP_JWT_USERNAME;
  const password = process.env.WP_JWT_PASSWORD;
  if (!username || !password) {
    throw new Error("Thiếu biến môi trường WP_JWT_USERNAME/WP_JWT_PASSWORD — xem .env.example.");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as { token?: string; message?: string } | null;

  if (!res.ok || !data?.token) {
    throw new Error(`[wp-auth] Lấy JWT token thất bại (HTTP ${res.status}): ${data?.message ?? "không rõ lỗi"}`);
  }

  return data.token;
}

/** Lấy JWT token còn hiệu lực — tái dùng token trong bộ nhớ nếu chưa hết hạn cache. */
async function getWpAuthToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  const token = await requestNewToken();
  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_CACHE_MS };
  return token;
}

export type WpAuthedResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

/**
 * Gọi WP REST API có xác thực JWT (POST/PUT/DELETE — tạo/sửa dữ liệu). Khác wpFetch()
 * (lib/wp.ts, chỉ GET công khai, không throw). Tự thử lại 1 lần với token mới nếu gặp
 * 401/403 (token cũ hết hạn/bị thu hồi phía WordPress, không đồng bộ với cache phía Next.js).
 * Không throw ra ngoài — trả về discriminated union để nơi gọi (Route Handler) tự quyết định
 * mã lỗi HTTP trả về cho client.
 */
export async function wpAuthedFetch<T>(
  path: string,
  init: { method: "POST" | "PUT" | "DELETE"; body?: unknown },
): Promise<WpAuthedResult<T>> {
  const doRequest = (token: string) =>
    fetch(`${WP_API_BASE}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

  try {
    let token = await getWpAuthToken();
    let res = await doRequest(token);

    if (res.status === 401 || res.status === 403) {
      token = await getWpAuthToken(true);
      res = await doRequest(token);
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        data && typeof data === "object" && "message" in data
          ? String((data as { message?: unknown }).message)
          : `HTTP ${res.status}`;
      console.error(`[wpAuthedFetch] ${init.method} ${path} → ${message}`);
      return { ok: false, status: res.status, message };
    }

    return { ok: true, data: data as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định khi gọi WP REST API.";
    console.error(`[wpAuthedFetch] ${init.method} ${path} → lỗi mạng/xác thực`, err);
    return { ok: false, status: 0, message };
  }
}