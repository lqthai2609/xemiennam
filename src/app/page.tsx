import { ArrowRight, Clock3, MapPin, Milestone, Star, Ticket, ShieldCheck, Users, BusFront } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { FleetShowcase } from "@/components/fleet-showcase";
import { fetchRoutes } from "@/lib/api/routes";
import { fetchPosts } from "@/lib/api/blog";
import { BlogCard } from "@/components/blog-card";
import { BookingBar } from "@/components/booking-bar";
import { navItems } from "@/data/nav";
import type { Route } from "@/types/route";

/**
 * KHÔI PHỤC Ngày 12: commit "ngay 11" trên GitHub đã vô tình ghi đè toàn bộ trang chủ
 * bằng nội dung của /doi-xe (giống hệt FleetPage). Bản dưới đây phục hồi đúng trang chủ
 * (commit "Build vehicle fleet listing and detail pages", trước khi bị ghi đè) và chuyển
 * sang Server Component để fetchRoutes() (WP REST API thật) chạy được ISR — trang chủ vốn
 * là "use client" nên không thể fetch có revalidate ở đây; phần tương tác duy nhất (tab lọc
 * đội xe) đã tách riêng sang <FleetShowcase /> (client component, không cần dữ liệu fetch).
 */

const stats = [
  { value: "15+", label: "tuyến cố định miền Nam" },
  { value: "4–45", label: "chỗ, đủ loại xe" },
  { value: "24/7", label: "tổng đài & Zalo hỗ trợ" },
  { value: "0đ", label: "phụ phí phát sinh" },
];

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Đội xe", href: "/doi-xe" },
      { label: "Cẩm nang đi đường", href: "/blog" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Chính sách huỷ chuyến", href: "#" },
      { label: "Liên hệ", href: "/#booking" },
    ],
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function RouteCard({ route }: { route: Route }) {
  return (
    <article className="route-ticket">
      <div className="rt-price">
        <span>Giá từ</span>
        <b>{route.price}</b>
      </div>
      <div className="rt-body">
        <div className="rt-route">
          <span>{route.from}</span>
          <ArrowRight size={16} />
          <span>{route.to}</span>
        </div>
        <div className="rt-meta">
          <span>
            <Clock3 size={13} /> {route.time}
          </span>
          <span>
            <Milestone size={13} /> {route.distance}
          </span>
          <span className="rt-vehicles">{route.vehicleTypes.join(" · ")}</span>
        </div>
      </div>
      <div className="rt-cta">
        <Link href={`/tuyen-duong/${route.slug}`}>
          Xem chi tiết <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

export default async function Home() {
  const [routes, posts] = await Promise.all([fetchRoutes(), fetchPosts()]);
  const destinations = [...new Set(routes.map((r) => r.to).filter(Boolean))];
  const latestPosts = posts.slice(0, 3);

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> Đi đâu cũng có Xe Miền Nam
          </div>
          <h1>
            Đi xa hơn.
            <br />
            <em>Vui hơn.</em>
          </h1>
          <p>Từ thành phố đến biển xanh, từ miền Tây đến cao nguyên. Những chuyến xe tử tế cho hành trình đáng nhớ.</p>
          <div className="hero-actions">
            <Button size="lg" asChild>
              <a href="#booking">
                Tìm chuyến xe <ArrowRight data-icon="inline-end" />
              </a>
            </Button>
            <Link className="text-link" href="/tuyen-duong">
              Xem các tuyến đường <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-trust">
            <div className="avatar-stack">
              <span>H</span>
              <span>M</span>
              <span>T</span>
            </div>
            <span>
              <strong>4.9/5</strong> từ hơn 2.000 hành khách
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Minh họa tuyến đường miền Nam">
          <div className="sun" />
          <div className="horizon" />
          <div className="hill hill-back" />
          <div className="hill hill-front" />
          <div className="road">
            <span className="road-mark mark-1" />
            <span className="road-mark mark-2" />
            <span className="road-mark mark-3" />
          </div>
          <div className="route-pin">
            <MapPin size={17} fill="currentColor" /> <span>VŨNG TÀU</span>
          </div>
          <div className="signpost">
            <div className="sign sign-top">
              ĐÀ LẠT <ArrowRight size={16} />
            </div>
            <div className="sign sign-bottom">
              CẦN THƠ <ArrowRight size={16} />
            </div>
            <span className="pole" />
          </div>
          <div className="bus-illustration">
            <BusFront size={62} strokeWidth={1.4} />
            <span className="bus-window" />
            <span className="bus-wheel wheel-one" />
            <span className="bus-wheel wheel-two" />
          </div>
          <span className="visual-note note-one">SINCE 2012</span>
          <span className="visual-note note-two">TỬ TẾ TRÊN MỌI CUNG ĐƯỜNG</span>
        </div>
      </section>

      <div className="ticker-section" aria-label="Các tuyến phổ biến">
        <div className="ticker-track">
          {[...routes, ...routes].map((r, i) => (
            <span className="ticker-sign" key={`${r.slug}-${i}`}>
              {r.from} <ArrowRight size={13} /> {r.to}
              <small>{r.distance}</small>
            </span>
          ))}
        </div>
      </div>

      <section id="booking">
        <BookingBar destinations={destinations} />
      </section>

      <section className="routes-section section-wrap" id="routes">
        <div className="section-heading">
          <div>
            <SectionLabel>CÁC TUYẾN PHỔ BIẾN</SectionLabel>
            <h2>Đi đâu hôm nay?</h2>
          </div>
          <Link className="text-link" href="/tuyen-duong">
            Xem tất cả tuyến <ArrowRight size={17} />
          </Link>
        </div>
        <div className="route-list">
          {routes.map((route) => (
            <RouteCard key={route.slug} route={route} />
          ))}
        </div>
      </section>

      <FleetShowcase />

      <section className="stats-section">
        <div className="stats-band">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="promise-section" id="about">
        <div className="promise-art">
          <div className="ticket-big">
            <Ticket size={29} />
            <span>THUÊ TRỌN CHUYẾN</span>
            <strong>ĐI TỬ TẾ</strong>
            <small>XE MIỀN NAM · 2012—2024</small>
          </div>
        </div>
        <div className="promise-copy">
          <SectionLabel>ĐIỀU CHÚNG TÔI TIN</SectionLabel>
          <h2>Không chỉ là một chuyến xe.</h2>
          <p>Chúng tôi tin mỗi hành trình đều có thể bắt đầu bằng một nụ cười, một tài xế tử tế và chiếc xe luôn đúng giờ.</p>
          <ul>
            <li>
              <ShieldCheck size={20} />
              <span>
                <strong>An toàn là ưu tiên</strong>
                <br />
                Bảo dưỡng định kỳ, tài xế tận tâm.
              </span>
            </li>
            <li>
              <Users size={20} />
              <span>
                <strong>Phục vụ như người nhà</strong>
                <br />
                Luôn lắng nghe và hỗ trợ bạn.
              </span>
            </li>
          </ul>
          <a className="text-link" href="#stories">
            Câu chuyện của chúng tôi <ArrowRight size={17} />
          </a>
        </div>
      </section>

      <section className="stories-section section-wrap" id="stories">
        <div className="section-heading">
          <div>
            <SectionLabel>HÀNH KHÁCH NÓI GÌ</SectionLabel>
            <h2>Chuyện trên những cung đường.</h2>
          </div>
          <div className="rating">
            <Star size={18} fill="currentColor" />
            <strong>4.9</strong>
            <span> / 5.0</span>
          </div>
        </div>
        <div className="quote-grid">
          <blockquote>
            &ldquo;Lần đầu đi Đà Lạt bằng xe giường nằm mà thoải mái hơn mình nghĩ rất nhiều. Tài xế vui tính, xe sạch sẽ, đến nơi đúng giờ.&rdquo;
            <footer>
              <span className="quote-avatar">L</span>
              <strong>Lan Anh</strong>
              <span>· TP. Hồ Chí Minh → Đà Lạt</span>
            </footer>
          </blockquote>
          <blockquote>
            &ldquo;Đặt xe riêng cho gia đình đi Vũng Tàu, được đón tận nhà nên người lớn tuổi rất thích. Sẽ quay lại!&rdquo;
            <footer>
              <span className="quote-avatar">Q</span>
              <strong>Quang Minh</strong>
              <span>· TP. Hồ Chí Minh → Vũng Tàu</span>
            </footer>
          </blockquote>
        </div>
      </section>

      {latestPosts.length > 0 && (
        <section className="blog-section section-wrap" id="blog">
          <div className="section-heading">
            <div>
              <SectionLabel>BLOG</SectionLabel>
              <h2>Cẩm nang trước khi lên xe.</h2>
            </div>
            <Link className="text-link" href="/blog">
              Xem tất cả bài viết <ArrowRight size={17} />
            </Link>
          </div>
          <div className="route-grid blog-grid">
            {latestPosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}

      <section className="final-cta">
        <div>
          <SectionLabel>SẴN SÀNG LÊN ĐƯỜNG?</SectionLabel>
          <h2>
            Hành trình của bạn,
            <br />
            <em>chúng tôi lo.</em>
          </h2>
        </div>
        <div>
          <p>
            Đặt chuyến nhanh chóng, rõ ràng
            <br />
            và không có phí ẩn.
          </p>
          <Button size="lg">
            Bắt đầu đặt xe <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
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
