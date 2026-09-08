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
import { JsonLd } from "@/components/json-ld";
import { buildFaqPageSchema } from "@/lib/schema";
import { routeHref } from "@/types/route";

export type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await fetchPosts();
  return posts.map(({ slug }) => ({ slug }));
}

/** Ngày 23 — ưu tiên rankMathTitle/rankMathDescription trước khi tự soạn (mục 5, kiến trúc kỹ thuật). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  return post
    ? {
        title: post.rankMathTitle || `${post.title} | Blog Xe Miền Nam`,
        description: post.rankMathDescription || post.excerpt,
      }
    : { title: "Không tìm thấy bài viết | Xe Miền Nam" };
}

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
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
  const faqItems = post.faqItems ?? [];

  return (
    <main className="site-shell">
      {/* Ngày 23 — chỉ dựng FAQPage khi bài có faq_items thật (đa số bài không phải dạng hỏi-đáp, xem mục 5 kiến trúc kỹ thuật). */}
      {faqItems.length > 0 && (
        <JsonLd data={buildFaqPageSchema(faqItems.map((f) => ({ question: f.question, answer: f.answer })))} />
      )}
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

        {/* Ngày 23 — hiển thị đúng nội dung FAQ đã đưa vào JSON-LD (Google khuyến nghị FAQPage
            phải có nội dung hiển thị tương ứng, không chỉ nằm trong structured data). */}
        {faqItems.length > 0 && (
          <section className="blog-detail-faq">
            <p className="section-label">CÂU HỎI THƯỜNG GẶP</p>
            <div className="blog-faq-list">
              {faqItems.map((item, index) => (
                <details className="blog-faq-item" key={`${item.question}-${index}`}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {relatedRoutes.length > 0 && (
          <aside className="blog-detail-related">
            <p className="section-label">TUYẾN LIÊN QUAN</p>
            <div className="blog-related-links">
              {relatedRoutes.map((route) => (
                <Link key={route.slug} href={routeHref(route)} className="text-link">
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
