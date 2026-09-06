import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { fetchPosts, fetchPostBySlug } from "@/lib/api/blog";
import { fetchRoutes } from "@/lib/api/routes";
import { formatVNDate } from "@/lib/wp";

export type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await fetchPosts();
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  return post
    ? { title: `${post.title} | Blog Xe Miền Nam`, description: post.excerpt }
    : { title: "Không tìm thấy bài viết | Xe Miền Nam" };
}

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

/**
 * Server Component — gọi fetchPostBySlug() (WP REST API thật + fallback mock, Ngày 17)
 * song song fetchRoutes() để dựng khối "Tuyến liên quan" cuối bài (internal-link về trang
 * tuyến, đúng mục 10 xemiennam-v0-prompts.md). "Cập nhật lần cuối" hiển thị modifiedDate
 * thật từ WordPress ngay từ bây giờ — chỉ khác ngày đăng thì mới hiện dòng này.
 */
export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const [post, routes] = await Promise.all([fetchPostBySlug(slug), fetchRoutes()]);
  if (!post) notFound();

  const relatedRoutes = routes.slice(0, 3);

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="blog-detail-hero">
        <Link className="back-link" href="/blog">
          <ArrowLeft size={15} /> Tất cả bài viết
        </Link>
        <span className="blog-cat">{post.category}</span>
        <h1>{post.title}</h1>
        <div className="blog-detail-meta">
          <span>
            <CalendarClock size={14} /> Đăng {formatVNDate(post.publishedDate)}
          </span>
          {post.modifiedDate !== post.publishedDate && (
            <span>
              <RefreshCw size={14} /> Cập nhật lần cuối {formatVNDate(post.modifiedDate)}
            </span>
          )}
        </div>
      </section>

      <section className="section-wrap blog-detail-content">
        {/* Nội dung do admin site tự nhập trong wp-admin (không phải do người dùng cuối gửi lên) nên render trực tiếp HTML — xem ghi chú trong lib/api/blog.ts. */}
        <article className="blog-detail-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        {relatedRoutes.length > 0 && (
          <aside className="blog-detail-related">
            <p className="section-label">TUYẾN LIÊN QUAN</p>
            <div className="blog-related-links">
              {relatedRoutes.map((route) => (
                <Link key={route.slug} href={`/tuyen-duong/${route.slug}`} className="text-link">
                  {route.from} – {route.to} <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          </aside>
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
