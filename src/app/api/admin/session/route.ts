import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  fetchAdminSession,
  isSameOriginMutation,
} from "@/lib/admin-session";
import { WP_API_BASE } from "@/lib/wp";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(1024),
});

function cookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
    priority: "high" as const,
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  const session = await fetchAdminSession(token);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const csrf = request.cookies.get(ADMIN_CSRF_COOKIE)?.value ?? randomBytes(24).toString("base64url");
  const response = NextResponse.json({ authenticated: true, session, csrf });
  response.cookies.set(ADMIN_CSRF_COOKIE, csrf, cookieOptions(false));
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: "Yêu cầu đăng nhập không hợp lệ." }, { status: 403 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Tên đăng nhập hoặc mật khẩu không hợp lệ." }, { status: 422 });
  }

  const tokenUrl = `${new URL(WP_API_BASE).origin}/wp-json/jwt-auth/v1/token`;
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });
  const tokenData = (await tokenResponse.json().catch(() => null)) as { token?: string; message?: string } | null;
  if (!tokenResponse.ok || !tokenData?.token) {
    return NextResponse.json(
      { message: tokenData?.message || "Không thể xác thực tài khoản WordPress." },
      { status: 401 },
    );
  }

  const session = await fetchAdminSession(tokenData.token);
  if (!session) {
    return NextResponse.json({ message: "Tài khoản không có quyền quản trị tuyến và giá." }, { status: 403 });
  }

  const csrf = randomBytes(24).toString("base64url");
  const response = NextResponse.json({ authenticated: true, session, csrf });
  response.cookies.set(ADMIN_SESSION_COOKIE, tokenData.token, cookieOptions(true));
  response.cookies.set(ADMIN_CSRF_COOKIE, csrf, cookieOptions(false));
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: "Yêu cầu đăng xuất không hợp lệ." }, { status: 403 });
  }
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...cookieOptions(true), maxAge: 0 });
  response.cookies.set(ADMIN_CSRF_COOKIE, "", { ...cookieOptions(false), maxAge: 0 });
  return response;
}
