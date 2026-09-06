import type { BlogPost } from "@/types/blog";
import { blogPosts as mockPosts } from "@/data/blog";
import { fetchRawPosts, fetchRawPostBySlug, embeddedTermName, embeddedFeaturedImage, type WPPost } from "./raw";
import { stripHtml } from "@/lib/wp";

/**
 * fetchPosts()/fetchPostBySlug() — Ngày 17.
 * Cùng chiến lược fallback mock như routes.ts/vehicles.ts/services.ts (Ngày 12–13): WP
 * hiện chỉ có bài "Hello world!" mặc định, chưa có bài blog thật nào (nhập liệu thật dời
 * tới Ngày 25–26), nên khi API không trả về bài nào ngoài bài mặc định, dùng lại
 * data/blog.ts. Đổi `useMockFallback` thành false để thấy đúng trạng thái CMS thật.
 *
 * Khác các CPT khác: `post` LUÔN có sẵn bài "Hello world!" do WordPress tự tạo lúc cài
 * đặt (Ngày 1) — nên điều kiện fallback không chỉ kiểm tra "rỗng" mà còn loại trừ đúng
 * slug mặc định đó, tránh set fallback không kích hoạt vì API trả về đúng 1 bài rác.
 */
const useMockFallback = true;
const DEFAULT_WP_SLUG = "hello-world";

function mapWPPostToBlogPost(wp: WPPost): BlogPost {
  return {
    id: String(wp.id),
    slug: wp.slug,
    title: stripHtml(wp.title.rendered),
    excerpt: stripHtml(wp.excerpt.rendered),
    contentHtml: wp.content.rendered,
    category: embeddedTermName(wp._embedded, "blog_category") ?? "",
    publishedDate: wp.date,
    modifiedDate: wp.modified,
    featuredImageUrl: embeddedFeaturedImage(wp._embedded),
  };
}

export async function fetchPosts(): Promise<BlogPost[]> {
  const raw = (await fetchRawPosts()).filter((wp) => wp.slug !== DEFAULT_WP_SLUG);
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchPosts] WP chưa có bài blog thật — dùng dữ liệu mock tạm (xem ghi chú trong blog.ts).");
      return mockPosts;
    }
    return [];
  }
  return raw.map(mapWPPostToBlogPost).sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const wp = await fetchRawPostBySlug(slug);
  if (!wp || wp.slug === DEFAULT_WP_SLUG) {
    if (useMockFallback) return mockPosts.find((post) => post.slug === slug);
    return undefined;
  }
  return mapWPPostToBlogPost(wp);
}

export async function fetchRelatedPosts(currentSlug: string, count = 3): Promise<BlogPost[]> {
  const all = await fetchPosts();
  return all.filter((post) => post.slug !== currentSlug).slice(0, count);
}
