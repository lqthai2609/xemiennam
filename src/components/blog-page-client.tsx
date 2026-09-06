"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Compass, MapPin, Newspaper, RotateCcw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { formatVNDate } from "@/lib/wp";
import { navItems } from "@/data/nav";
import type { BlogPost } from "@/types/blog";

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

/** Icon thay ảnh đại diện khi bài chưa có featured image (nhập ảnh thật dời tới Ngày 25–26). */
function CategoryIcon({ category, size = 26 }: { category: string; size?: number }) {
  switch (category) {
    case "Kinh nghiệm":
      return <Compass size={size} />;
    case "Cẩm nang":
      return <BookOpen size={size} />;
    case "Review":
      return <MapPin size={size} />;
    case "Tin tức":
      return <Newspaper size={size} />;
    default:
      return <BookOpen size={size} />;
  }
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link className="blog-card" href={`/blog/${post.slug}`}>
      <div className="blog-thumb">
        {post.featuredImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh đến từ WordPress (domain động), chưa cấu hình next/image remotePatterns; nhập ảnh thật dời tới Ngày 25–26
          <img src={post.featuredImageUrl} alt={post.title} />
        ) : (
          <CategoryIcon category={post.category} />
        )}
      </div>
      <div className="blog-body">
        {post.category && <span className="blog-cat">{post.category}</span>}
        <h3>{post.title}</h3>
        <p className="blog-excerpt">{post.excerpt}</p>
        <span className="blog-date">{formatVNDate(post.publishedDate)}</span>
      </div>
    </Link>
  );
}

/** Nhận `posts` qua props — dữ liệu đã được fetchPosts() lấy từ WP REST API (Ngày 17) ở Server Component cha. */
export function BlogPageClient({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () => [...new Set(posts.map((post) => post.category).filter(Boolean))],
    [posts],
  );
  const filteredPosts = useMemo(
    () => (category ? posts.filter((post) => post.category === category) : posts),
    [category, posts],
  );

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />
      <section className="routes-hero">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" /> CẨM NANG
          </p>
          <h1>
            Đọc trước,
            <br />
            <em>đi chắc tay hơn.</em>
          </h1>
          <p>Kinh nghiệm đi đường, cẩm nang thuê xe và vài điểm dừng chân đáng ghé — góp nhặt từ những chuyến đi thật.</p>
        </div>
        <div className="routes-hero-sign">
          <span>XE MIỀN NAM</span>
          <strong>{posts.length}</strong>
          <small>BÀI VIẾT</small>
        </div>
      </section>

      <section className="section-wrap blog-page-content">
        {categories.length > 0 && (
          <div className="blog-filter">
            <button type="button" className={`vehicle-chip blog-filter-pill ${category === "" ? "is-active" : ""}`} onClick={() => setCategory("")}>
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`vehicle-chip blog-filter-pill ${category === cat ? "is-active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
            {category && (
              <button type="button" className="vehicle-chip blog-filter-pill blog-filter-clear" onClick={() => setCategory("")}>
                <RotateCcw size={13} /> Xóa lọc
              </button>
            )}
          </div>
        )}

        {filteredPosts.length > 0 ? (
          <div className="route-grid blog-grid">
            {filteredPosts.map((post) => (
              <BlogCard post={post} key={post.id} />
            ))}
          </div>
        ) : (
          <div className="route-empty">
            <BookOpen size={30} />
            <h2>Chưa có bài nào trong danh mục này</h2>
            <p>Thử chọn danh mục khác hoặc xem tất cả bài viết.</p>
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
