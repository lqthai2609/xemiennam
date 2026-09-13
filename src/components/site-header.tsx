"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type NavItem = { label: string; href: string };

interface SiteHeaderProps {
  menuItems: NavItem[];
  hotline: string;
  ctaLabel: string;
  ctaHref: string;
}

// So khớp active bỏ qua phần hash (#routes, #fleet...) — chỉ so path thật,
// để không tô sáng nhầm khi menu trỏ vào section trong cùng 1 trang.
function isActive(pathname: string, href: string) {
  const [base] = href.split("#");
  // href kiểu "#routes" (anchor thuần trong cùng trang) không phải 1 route riêng — bỏ qua.
  if (!base) return false;
  return base === pathname;
}

export function SiteHeader({ menuItems, hotline, ctaLabel, ctaHref }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  function handleRouteSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("from") || "").trim();
    const to = String(form.get("to") || "").trim();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.href = `/tuyen-duong${params.size ? `?${params.toString()}` : ""}`;
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="GoCarVN trang chủ">
        <img
          className="brand-logo"
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-gocarvn-cNmS8uO5sRp2ZzMP73kde8SXuUE6Wo.png"
          alt="GoCarVN - Đồng hành mọi hành trình"
        />
      </Link>
      <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Điều hướng chính">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={isActive(pathname, item.href) ? "is-active" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <a className="nav-hotline" href={`tel:${hotline.replace(/\s/g, "")}`}>
          <Phone size={16} /> {hotline}
        </a>
        <Button className="nav-cta" asChild>
          <Link href={ctaHref}>
            {ctaLabel} <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </nav>
      <button
        className="header-search-toggle"
        onClick={() => setSearchOpen(true)}
        aria-label="Tìm tuyến đường"
      >
        <Search />
      </button>
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>
      {searchOpen && (
        <div className="header-search-overlay" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="header-search-dialog" role="dialog" aria-modal="true" aria-labelledby="header-search-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="header-search-close" type="button" onClick={() => setSearchOpen(false)} aria-label="Đóng tìm tuyến">
              <X />
            </button>
            <p className="section-label">TÌM TUYẾN NHANH</p>
            <h2 id="header-search-title">Bạn muốn đi đâu?</h2>
            <p className="header-search-description">Nhập điểm đi và điểm đến để xem các tuyến phù hợp.</p>
            <form className="header-search-form" onSubmit={handleRouteSearch}>
              <label><span>Điểm đi</span><input name="from" placeholder="Ví dụ: TP. Hồ Chí Minh" autoFocus /></label>
              <label><span>Điểm đến</span><input name="to" placeholder="Ví dụ: Vũng Tàu" required /></label>
              <Button type="submit">Tìm tuyến <ArrowRight data-icon="inline-end" /></Button>
            </form>
          </section>
        </div>
      )}
    </header>
  );
}
