import type { BlogPost } from "@/types/blog";
import { blogPosts as mockPosts } from "@/data/blog";
import { fetchRawPosts, fetchRawPostBySlug, embeddedTermName, embeddedTerms, embeddedFeaturedImage, type WPPost } from "./raw";
import { shouldUseMockFallback } from "./mock-fallback";
import { stripHtml, parseFaqItems } from "@/lib/wp";

const useMockFallback = shouldUseMockFallback();
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
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
    faqItems: parseFaqItems(wp.faq_items),
  };
}

export async function fetchPosts(): Promise<BlogPost[]> {
  const raw = (await fetchRawPosts()).filter((wp) => wp.slug !== DEFAULT_WP_SLUG);
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchPosts] WP chưa có bài blog thật — dùng dữ liệu mock theo policy môi trường.");
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
    const raw = (await fetchRawPosts()).filter((p) => p.slug !== DEFAULT_WP_SLUG);
    if (raw.length === 0) {
      return mockPosts.find((post) => post.slug === slug);
    }
  }
  return undefined;
}

export async function fetchPostsByVehicleType(vehicleTypeSlug: string, count = 3): Promise<BlogPost[]> {
  const raw = (await fetchRawPosts()).filter((wp) => wp.slug !== DEFAULT_WP_SLUG);
  const matched = raw.filter((wp) => embeddedTerms(wp._embedded, "vehicle_type").some((term) => term.slug === vehicleTypeSlug));
  return matched
    .map(mapWPPostToBlogPost)
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1))
    .slice(0, count);
}

export async function fetchRelatedPosts(currentSlug: string, count = 3): Promise<BlogPost[]> {
  const all = await fetchPosts();
  return all.filter((post) => post.slug !== currentSlug).slice(0, count);
}

export async function fetchPostsByRegion(regionSlug: string, count = 3): Promise<BlogPost[]> {
  const raw = (await fetchRawPosts()).filter((wp) => wp.slug !== DEFAULT_WP_SLUG);
  const matched = raw.filter((wp) => embeddedTerms(wp._embedded, "province").some((term) => term.slug === regionSlug));
  if (raw.length === 0 && useMockFallback) return mockPosts.slice(0, count);
  return matched.map(mapWPPostToBlogPost).sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1)).slice(0, count);
}
