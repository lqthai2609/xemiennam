"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { clearMarketingCookies, marketingConsentStorageKey, readMarketingConsent, setMarketingConsent, subscribeMarketingConsent } from "@/lib/marketing-consent";

export function MarketingConsent() {
  const state = useSyncExternalStore(subscribeMarketingConsent, readMarketingConsent, () => null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOtherTab = (event: StorageEvent) => {
      if (event.key === marketingConsentStorageKey) window.location.reload();
    };
    const expiryCheck = window.setInterval(() => {
      if (state === "granted" && readMarketingConsent() !== "granted") window.location.reload();
    }, 60_000);
    window.addEventListener("storage", onOtherTab);
    return () => {
      window.clearInterval(expiryCheck);
      window.removeEventListener("storage", onOtherTab);
    };
  }, [state]);

  function choose(next: "granted" | "denied") {
    if (!setMarketingConsent(next)) return;
    if (next === "denied") {
      window.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied" });
      clearMarketingCookies();
    }
    // Reload removes existing third-party scripts after withdrawal, and only loads them
    // after an explicit grant. No marketing event is sent in this transition.
    window.location.reload();
  }

  if (state === null) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-[min(26rem,calc(100vw-2rem))]">
      {open || state === "unknown" ? (
        <section aria-label="Lựa chọn đo lường" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <h2 className="text-base font-semibold text-slate-900">Quyền riêng tư</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Alo Đặt Xe xin phép dùng Google Analytics để đo lường lượt truy cập và hiệu quả của các trang.
            Anh/chị vẫn có thể đặt xe nếu từ chối. Chúng tôi chỉ bật công cụ này sau khi anh/chị đồng ý.
          </p>
          <details className="mt-2 text-sm text-slate-600">
            <summary className="cursor-pointer">Dữ liệu và thời hạn</summary>
            <p className="mt-2 leading-relaxed">
              Khi đồng ý, việc đo lường có thể ghi nhận trang đã xem, nguồn truy cập và sự kiện liên hệ hoặc gửi yêu cầu.
              Lựa chọn đồng ý tự hết hiệu lực sau 30 ngày. Có thể đổi lựa chọn tại nút Quyền riêng tư; dữ liệu đặt xe cần thiết để phục vụ chuyến đi được xử lý riêng.
            </p>
          </details>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => choose("denied")} className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800">
              Từ chối
            </button>
            <button type="button" onClick={() => choose("granted")} className="min-h-11 flex-1 rounded-xl bg-[#0000D8] px-3 text-sm font-semibold text-white">
              Đồng ý
            </button>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 shadow-md" aria-label="Đổi lựa chọn quyền riêng tư">
          Quyền riêng tư{state === "granted" ? " · Đã đồng ý" : ""}
        </button>
      )}
    </div>
  );
}
