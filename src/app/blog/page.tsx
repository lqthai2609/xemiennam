import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { BlogCard } from "@/components/blog-card";
import { fetchPosts } from "@/lib/api/blog";
import { UnifiedHero } from "@/components/unified-hero";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = buildPageMetadata({
  title: `Blog | ${SITE_NAME}`,
  description: `Kinh nghiệm du lịch, cẩm nang tuyến đường và review điểm đến cho hành trình cùng ${SITE_NAME}.`,
  path: "/blog",
});

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

/** Server Component — gọi fetchPosts() (WP REST API thật + fallback mock, Ngày 17). ISR áp dụng qua revalidate trong wpFetch(). */
export default async function BlogPage() {
  const posts = await fetchPosts();

  return (
    <main className="site-shell">
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="/#booking"
      />

      <UnifiedHero eyebrow="BLOG" title={<>Cẩm nang<br /><em>trước khi lên xe.</em></>} description="Kinh nghiệm du lịch, cẩm nang tuyến đường và review điểm đến — cập nhật đều đặn." />

      <section className="section-wrap blog-index-content">
        {posts.length === 0 ? (
          <p className="blog-empty">Chưa có bài viết nào. Quay lại sau nhé!</p>
        ) : (
          <div className="route-grid blog-grid">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter
        tagline={
          <>
            Đi đâu cũng có {SITE_NAME}.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}`}
        madeFor="Made for the road."
        brandName={SITE_NAME}
      />
    </main>
  );
}
