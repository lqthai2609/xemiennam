"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Star } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { navItems } from "@/data/nav";
import { formatVNDate } from "@/lib/wp";
import type { Testimonial } from "@/types/testimonial";
import type { Route } from "@/types/route";

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Đội xe", href: "/doi-xe" },
      { label: "Khuyến mãi", href: "/khuyen-mai" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

function routeLabel(routes: Route[], slug?: string): string | undefined {
  if (!slug) return undefined;
  const route = routes.find((r) => r.slug === slug);
  return route ? `${route.from} – ${route.to}` : undefined;
}

/**
 * Trang /danh-gia (Ngày 18) — nhận `testimonials` (fetchTestimonials(), WP REST thật +
 * fallback mock) và `routes` (để hiển thị tên tuyến đầy đủ thay vì slug thô) qua props từ
 * Server Component cha (app/danh-gia/page.tsx). Lọc theo số sao + tuyến chạy client-side,
 * đúng mục 11 xemiennam-v0-prompts.md: điểm trung bình tổng quan nổi bật ở đầu trang, bên
 * dưới là lưới đánh giá chi tiết kèm bộ lọc.
 */
export function DanhGiaPageClient({ testimonials, routes }: { testimonials: Testimonial[]; routes: Route[] }) {
  const [starFilter, setStarFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState("");

  const routeOptions = useMemo(() => {
    const slugs = [...new Set(testimonials.map((t) => t.routeSlug).filter((slug): slug is string => Boolean(slug)))];
    return slugs
      .map((slug) => ({ slug, label: routeLabel(routes, slug) ?? slug }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [testimonials, routes]);

  const filtered = useMemo(() => {
    return testimonials.filter((t) => {
      if (starFilter && String(t.rating) !== starFilter) return false;
      if (routeFilter && t.routeSlug !== routeFilter) return false;
      return true;
    });
  }, [testimonials, starFilter, routeFilter]);

  const hasFilters = Boolean(starFilter || routeFilter);
  const clearFilters = () => {
    setStarFilter("");
    setRouteFilter("");
  };

  const avgRating = testimonials.length
    ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
    : 0;
  const avgRatingLabel = avgRating.toFixed(1);

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="danh-gia-hero">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> ĐÁNH GIÁ KHÁCH HÀNG
          </p>
          <h1>
            Khách đã đi
            <br />
            <em>nói gì.</em>
          </h1>
          <p>Trải nghiệm thật từ những hành khách đã thuê xe cùng Xe Miền Nam.</p>
        </div>
        <div className="danh-gia-rating-big">
          <strong>
            {avgRatingLabel}
            <span>/5</span>
          </strong>
          <div className="danh-gia-rating-stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} fill={i < Math.round(avgRating) ? "currentColor" : "none"} />
            ))}
          </div>
          <span>dựa trên {testimonials.length} đánh giá</span>
        </div>
      </section>

      <section className="section-wrap danh-gia-content">
        <div className="danh-gia-toolbar">
          <label>
            <span>Số sao</span>
            <select value={starFilter} onChange={(event) => setStarFilter(event.target.value)}>
              <option value="">Tất cả</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} sao
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tuyến</span>
            <select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)}>
              <option value="">Tất cả tuyến</option>
              {routeOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {hasFilters && (
            <Button type="button" variant="outline" className="clear-filter" onClick={clearFilters}>
              <RotateCcw data-icon="inline-start" /> Xóa bộ lọc
            </Button>
          )}
          <p className="route-count">
            <strong>{filtered.length}</strong> đánh giá
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="danh-gia-empty">Không tìm thấy đánh giá phù hợp bộ lọc đã chọn.</p>
        ) : (
          <div className="route-grid danh-gia-grid">
            {filtered.map((t) => (
              <article className="combo-testimonial-card danh-gia-card" key={t.id}>
                <div className="combo-testimonial-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < t.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p>{t.quote}</p>
                <div className="combo-testimonial-who danh-gia-card-who">
                  <span className="combo-testimonial-avatar">{t.initials}</span>
                  <div className="danh-gia-card-who-copy">
                    <b>{t.name}</b>
                    <span className="danh-gia-card-context">
                      {[routeLabel(routes, t.routeSlug), t.vehicleType].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {t.date && <time className="danh-gia-date">{formatVNDate(t.date)}</time>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <SiteFooter
        tagline={
          <>
            Đi đâu cũng có Xe Miền Nam.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
        phone="1900 6789"
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright="© 2026 Xe Miền Nam"
        madeFor="Made for the road."
      />
    </main>
  );
}
