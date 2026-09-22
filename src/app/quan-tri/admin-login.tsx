"use client";

import { LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./route-pricing-admin-wizard.module.css";

export function AdminLogin() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setMessage(data?.message || "Không thể đăng nhập.");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <main className={styles.loginShell}>
      <section className={styles.loginCard}>
        <div className={styles.loginMark}>A</div>
        <p className={styles.eyebrow}>ALO ĐẶT XE</p>
        <h1>Đăng nhập quản trị</h1>
        <p className={styles.loginIntro}>
          Sử dụng tài khoản WordPress được cấp quyền vận hành. Mật khẩu chỉ được chuyển tới WordPress để xác thực và không được lưu trong trình duyệt.
        </p>
        <form onSubmit={submit} className={styles.loginForm}>
          <label>
            <span>Tên đăng nhập WordPress</span>
            <input name="username" autoComplete="username" required maxLength={128} />
          </label>
          <label>
            <span>Mật khẩu</span>
            <input name="password" type="password" autoComplete="current-password" required maxLength={1024} />
          </label>
          {message && <p className={styles.loginError}>{message}</p>}
          <button type="submit" disabled={pending}>
            {pending ? <LockKeyhole aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            {pending ? "Đang xác thực…" : "Đăng nhập"}
          </button>
        </form>
        <div className={styles.loginSafety}>
          <ShieldCheck aria-hidden="true" />
          <span>Mọi thay đổi đều qua kiểm tra, phê duyệt, audit và có thể rollback.</span>
        </div>
      </section>
    </main>
  );
}
