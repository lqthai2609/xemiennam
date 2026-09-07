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

/**
 * Parse field `faq_items` (chuỗi JSON thô "[{\"cau_hoi\":...,\"tra_loi\":...}]", đăng ký qua
 * snippet WPCode riêng — Ngày 23) sang mảng {question, answer}. Trả về mảng rỗng thay vì
 * throw nếu JSON hỏng hoặc field trống, để 1 bài nhập liệu sai không làm sập cả trang blog.
 */
function parseFaqItems(raw: string | undefined): { question: string; answer: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        question: typeof item?.cau_hoi === "string" ? item.cau_hoi.trim() : "",
        answer: typeof item?.tra_loi === "string" ? item.tra_loi.trim() : "",
      }))
      .filter((item) => item.question && item.answer);
  } catch {
    console.warn("[parseFaqItems] faq_items không phải JSON hợp lệ — bỏ qua.");
    return [];
  }
}

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
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
    faqItems: parseFaqItems(wp.faq_items),
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
  if (wp && wp.slug !== DEFAULT_WP_SLUG) return mapWPPostToBlogPost(wp);
  if (useMockFallback) {
    // Bugfix: chỉ fallback về mock khi CẢ blog trên WP đang rỗng (chỉ có bài "Hello world!"
    // mặc định, chưa có bài thật nào). Trước đây fallback theo từng slug riêng lẻ, nên xoá 1
    // bài blog thật trùng slug mock sẽ khiến trang "hồi sinh" bằng nội dung mock thay vì báo 404.
    const raw = (await fetchRawPosts()).filter((p) => p.slug !== DEFAULT_WP_SLUG);
    if (raw.length === 0) {
      return mockPosts.find((post) => post.slug === slug);
    }
  }
  return undefined;
}

export async function fetchRelatedPosts(currentSlug: string, count = 3): Promise<BlogPost[]> {
  const all = await fetchPosts();
  return all.filter((post) => post.slug !== currentSlug).slice(0, count);
}
