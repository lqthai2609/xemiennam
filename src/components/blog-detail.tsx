import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock3, Compass, MapPin, Milestone, Newspaper } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { formatVNDate } from "@/lib/wp";
import { navItems } from "@/data/nav";
import type { BlogPost } from "@/types/blog";
import type { Route } from "@/types/route";

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
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

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

/** Thẻ tuyến rút gọn cho khối "Tuyến liên quan" — cùng markup .route-ticket đã dùng ở RouteDetailPage. */
function RelatedRouteCard({ route }: { route: Route }) {
  return (
    <Link className="route-ticket related-ticket" href={`/tuyen-duong/${route.slug}`}>
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
        </div>
      </div>
      <div className="rt-cta">
        Xem tuyến <ArrowRight size={14} />
      </div>
    </Link>
  );
}

export function BlogDetailPage({ post, relatedPosts, relatedRoutes }: { post: BlogPost; relatedPosts: BlogPost[]; relatedRoutes: Route[] }) {
  const wasUpdated = post.modifiedDate && post.modifiedDate !== post.publishedDate;

  return (
    <main className="site-shell post-detail-page">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="post-hero">
        <Link className="back-link" href="/blog">
          <ArrowRight size={15} className="back-arrow" /> Tất cả bài viết
        </Link>
        {post.category && (
          <p className="eyebrow">
            <span className="eyebrow-line" /> {post.category}
          </p>
        )}
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span>
            <Calendar size={15} /> Đăng ngày {formatVNDate(post.publishedDate)}
          </span>
          {wasUpdated && (
            <span>
              <Clock3 size={15} /> Cập nhật lần cuối {formatVNDate(post.modifiedDate)}
            </span>
          )}
        </div>
      </section>

      <section className="section-wrap post-content-wrap">
        {post.featuredImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh đến từ WordPress (domain động), chưa cấu hình next/image remotePatterns
          <img className="post-featured-image" src={post.featuredImageUrl} alt={post.title} />
        ) : (
          <div className="post-featured-placeholder">
            <CategoryIcon category={post.category} size={32} />
          </div>
        )}
        <article className="post-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </section>

      {relatedRoutes.length > 0 && (
        <section className="related-section section-wrap">
          <div className="section-heading">
            <div>
              <p className="section-label">CÓ THỂ BẠN QUAN TÂM</p>
              <h2>Tuyến liên quan.</h2>
            </div>
            <Link className="text-link" href="/tuyen-duong">
              Xem tất cả tuyến <ArrowRight size={17} />
            </Link>
          </div>
          <div className="route-list related-list">
            {relatedRoutes.map((route) => (
              <RelatedRouteCard route={route} key={route.id} />
            ))}
          </div>
        </section>
      )}

      {relatedPosts.length > 0 && (
        <section className="related-section section-wrap post-related-posts">
          <div className="section-heading">
            <div>
              <p className="section-label">ĐỌC THÊM</p>
              <h2>Bài viết khác.</h2>
            </div>
            <Link className="text-link" href="/blog">
              Xem tất cả bài viết <ArrowRight size={17} />
            </Link>
          </div>
          <div className="route-grid blog-grid">
            {relatedPosts.map((related) => (
              <Link className="blog-card" href={`/blog/${related.slug}`} key={related.id}>
                <div className="blog-thumb">
                  <CategoryIcon category={related.category} />
                </div>
                <div className="blog-body">
                  {related.category && <span className="blog-cat">{related.category}</span>}
                  <h3>{related.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
