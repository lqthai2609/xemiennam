import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BlogPageClient } from "@/components/blog-page-client";
import { navItems } from "@/data/nav";
import { fetchPosts } from "@/lib/api/blog";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import "@/components/blog-redesign.css";

export const metadata: Metadata = buildPageMetadata({
  title: `Blog | ${SITE_NAME}`,
  description: `Kinh nghiệm du lịch, cẩm nang tuyến đường và review điểm đến cho hành trình cùng ${SITE_NAME}.`,
  path: "/blog",
});

export default async function BlogPage() {
  const posts = await fetchPosts();
  // Chỉ chuyển dữ liệu thẻ cho bộ lọc; nội dung HTML đầy đủ vẫn ở Server Component.
  const summaries = posts.map((post) => ({ ...post, contentHtml: undefined }));
  return (
    <main className="site-shell blog-redesign">
      <SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Đặt xe ngay" ctaHref="/#booking" />
      <BlogPageClient posts={summaries} />
      <SiteFooter />
    </main>
  );
}
