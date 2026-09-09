import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { BlogCard } from "@/components/blog-card";
import { fetchPosts } from "@/lib/api/blog";
import { UnifiedHero } from "@/components/unified-hero";

export const metadata: Metadata = {
  title: "Blog | Xe Miền Nam",
  description: "Kinh nghiệm du lịch, cẩm nang tuyến đường và review điểm đến cho hành trình cùng Xe Miền Nam.",
};

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
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

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
