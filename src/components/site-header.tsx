"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Home, Phone, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./site-header.css";

export type NavItem = { label: string; href: string };

interface SiteHeaderProps {
  menuItems: NavItem[];
  hotline: string;
  hotlineHref?: string;
  ctaLabel: string;
  ctaHref: string;
}

function isActive(pathname: string, href: string) {
  const [base] = href.split("#");
  if (!base) return false;
  return base === pathname;
}

export function SiteHeader({ menuItems, hotline, hotlineHref, ctaLabel, ctaHref }: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const resolvedHotlineHref = hotlineHref || `tel:${hotline.replace(/\s/g, "")}`;

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
      <Link href="/" className="brand" aria-label="Alo Đặt Xe trang chủ">
        <img
          className="brand-logo"
          src="/logo-alo-dat-xe.webp"
          alt="Alo Đặt Xe - Đồng hành mọi hành trình"
        />
      </Link>
      <nav className="main-nav" aria-label="Điều hướng chính">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={isActive(pathname, item.href) ? "is-active" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <a className="nav-hotline" href={resolvedHotlineHref}>
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

      <nav className="mobile-nav-strip" aria-label="Điều hướng nhanh">
        <Link
          href="/"
          className={`mobile-nav-home ${pathname === "/" ? "is-active" : ""}`}
          aria-current={pathname === "/" ? "page" : undefined}
          aria-label="Trang chủ"
        >
          <Home />
        </Link>
        {menuItems.map((item) => (
          <Link
            key={`mobile-${item.label}`}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={isActive(pathname, item.href) ? "is-active" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

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
