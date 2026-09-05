"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
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
  const pathname = usePathname();

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Xe Miền Nam trang chủ">
        <span className="brand-mark">XM</span>
        <span>XE MIỀN NAM</span>
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
        className="menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>
    </header>
  );
}
