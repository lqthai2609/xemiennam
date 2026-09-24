import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  adminApiUrl,
  fetchAdminSession,
  isSameOriginMutation,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

const ALLOWED_PATHS = [
  /^drafts$/,
  /^drafts\/\d+$/,
  /^drafts\/\d+\/(?:validate|submit|publish)$/,
  /^apply$/,
  /^routes$/,
  /^routes\/\d+\/archive$/,
  /^audit$/,
  /^audit\/\d+\/rollback$/,
  /^leads\/\d+$/,
  /^leads\/\d+\/transition$/,
];

function allowed(path: string) {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

type AdminRouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: AdminRouteContext) {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  if (!allowed(path)) return NextResponse.json({ message: "Endpoint không hợp lệ." }, { status: 404 });

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  const session = await fetchAdminSession(token);
  if (!session) return NextResponse.json({ message: "Phiên đăng nhập đã hết hạn." }, { status: 401 });

  const mutating = request.method !== "GET";
  if (mutating) {
    const csrfCookie = request.cookies.get(ADMIN_CSRF_COOKIE)?.value ?? "";
    const csrfHeader = request.headers.get("x-gocar-csrf") ?? "";
    if (!isSameOriginMutation(request) || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json({ message: "Mã bảo vệ yêu cầu không hợp lệ." }, { status: 403 });
    }
  }

  const body = mutating ? await request.text() : undefined;
  const upstream = await fetch(adminApiUrl(path), {
    method: request.method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(mutating
        ? { "X-Gocar-Idempotency-Key": request.headers.get("x-gocar-idempotency-key") || randomUUID() }
        : {}),
    },
    body: body || undefined,
    cache: "no-store",
  });
  const data = await upstream.json().catch(() => ({ message: `WordPress HTTP ${upstream.status}` }));

  if (upstream.ok && mutating && /(?:apply|publish|archive|rollback)$/.test(path)) {
    revalidatePath("/", "layout");
  }

  return NextResponse.json(data, { status: upstream.status });
}

export async function GET(request: NextRequest, context: AdminRouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: AdminRouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: AdminRouteContext) {
  return proxy(request, context);
}
