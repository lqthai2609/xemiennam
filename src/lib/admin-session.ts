import "server-only";

import { cookies } from "next/headers";
import { WP_API_BASE } from "@/lib/wp";

export const ADMIN_SESSION_COOKIE = "alo_admin_session";
export const ADMIN_CSRF_COOKIE = "alo_admin_csrf";
export const ADMIN_SESSION_MAX_AGE = 6 * 60 * 60;

export type AdminSession = {
  id: number;
  name: string;
  canPublish: boolean;
  contract: number;
};

export function adminApiUrl(path: string) {
  const origin = new URL(WP_API_BASE).origin;
  return `${origin}/wp-json/gocar/v1/admin/${path.replace(/^\/+/, "")}`;
}

export async function fetchAdminSession(token: string): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const response = await fetch(adminApiUrl("session"), {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<AdminSession>;
    if (!Number.isInteger(data.id) || !data.name || data.contract !== 1) return null;
    return {
      id: data.id as number,
      name: String(data.name),
      canPublish: Boolean(data.canPublish),
      contract: data.contract,
    };
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  const csrf = cookieStore.get(ADMIN_CSRF_COOKIE)?.value ?? "";
  const session = await fetchAdminSession(token);
  return session && csrf ? { session, csrf } : null;
}

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}
