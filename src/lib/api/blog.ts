import type { BlogPost } from "@/types/blog";
import { blogPosts as mockPosts } from "@/data/blog";
import {
  fetchRawPosts,
  fetchRawPostBySlug,
  embeddedTermName,
  embeddedTerms,
  embeddedFeaturedImage,
  type WPPost,
} from "./raw";
import { shouldUseMockFallback } from "./mock-fallback";
import { stripHtml, parseFaqItems } from "@/lib/wp";

const useMockFallback = shouldUseMockFallback();
const DEFAULT_WP_SLUG = "hello-world";

type WPBlogPost = WPPost & {
  meta?: {
    related_airport_location_ids?: (number | string)[];
  };
};

function uniqueSlugs(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function positiveIntegerIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value)),
    ),
  ).sort((a, b) => a - b);
}

function mapWPPostToBlogPost(wp: WPBlogPost): BlogPost {
  return {
    id: String(wp.id),
    slug: wp.slug,
    title: stripHtml(wp.title.rendered),
    excerpt: stripHtml(wp.excerpt.rendered),
    contentHtml: wp.content.rendered,
    category: embeddedTermName(wp._embedded, "blog_category") ?? "",
    provinceSlugs: uniqueSlugs(embeddedTerms(wp._embedded, "province").map((term) => term.slug)),
    vehicleTypeSlugs: uniqueSlugs(embeddedTerms(wp._embedded, "vehicle_type").map((term) => term.slug)),
    airportLocationIds: positiveIntegerIds(wp.meta?.related_airport_location_ids),
    publishedDate: wp.date,
    modifiedDate: wp.modified,
    featuredImageUrl: embeddedFeaturedImage(wp._embedded),
    rankMathTitle: wp.rank_math_title || undefined,
    rankMathDescription: wp.rank_math_description || undefined,
    faqItems: parseFaqItems(wp.faq_items),
  };
}

function newestFirst(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
}

function intersects<T>(left: T[], right: T[]): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

/**
 * Structured relation score only. Day 24 deliberately does not inspect title,
 * excerpt or contentHtml, so relation quality cannot regress to text matching.
 */
export function blogSemanticRelationScore(current: BlogPost, candidate: BlogPost): number {
  let score = 0;

  if (intersects(current.airportLocationIds, candidate.airportLocationIds)) score += 100;
  if (intersects(current.provinceSlugs, candidate.provinceSlugs)) score += 40;
  if (intersects(current.vehicleTypeSlugs, candidate.vehicleTypeSlugs)) score += 20;
  if (current.category && current.category === candidate.category) score += 5;

  return score;
}

export async function fetchPosts(): Promise<BlogPost[]> {
  const raw = ((await fetchRawPosts()) as WPBlogPost[]).filter((wp) => wp.slug !== DEFAULT_WP_SLUG);
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchPosts] WP chưa có bài blog thật — dùng dữ liệu mock theo policy môi trường.");
      return newestFirst(mockPosts);
    }
    return [];
  }
  return newestFirst(raw.map(mapWPPostToBlogPost));
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const wp = (await fetchRawPostBySlug(slug)) as WPBlogPost | null;
  if (wp && wp.slug !== DEFAULT_WP_SLUG) return mapWPPostToBlogPost(wp);
  if (useMockFallback) {
    const raw = ((await fetchRawPosts()) as WPBlogPost[]).filter((post) => post.slug !== DEFAULT_WP_SLUG);
    if (raw.length === 0) {
      return mockPosts.find((post) => post.slug === slug);
    }
  }
  return undefined;
}

export async function fetchPostsByVehicleType(vehicleTypeSlug: string, count = 3): Promise<BlogPost[]> {
  if (!vehicleTypeSlug.trim() || count <= 0) return [];
  const all = await fetchPosts();
  return all.filter((post) => post.vehicleTypeSlugs.includes(vehicleTypeSlug)).slice(0, count);
}

export async function fetchPostsByRegion(regionSlug: string, count = 3): Promise<BlogPost[]> {
  if (!regionSlug.trim() || count <= 0) return [];
  const all = await fetchPosts();
  return all.filter((post) => post.provinceSlugs.includes(regionSlug)).slice(0, count);
}

export async function fetchPostsByAirportLocationId(airportLocationId: number, count = 3): Promise<BlogPost[]> {
  const normalizedId = Math.trunc(Number(airportLocationId));
  if (!Number.isFinite(normalizedId) || normalizedId <= 0 || count <= 0) return [];
  const all = await fetchPosts();
  return all.filter((post) => post.airportLocationIds.includes(normalizedId)).slice(0, count);
}

/**
 * Related posts are ranked only by structured relations:
 * Airport Location V2 > Province taxonomy > Vehicle taxonomy > blog category.
 * No arbitrary newest-post fallback and no title/content text matching.
 */
export async function fetchRelatedPosts(currentSlug: string, count = 3): Promise<BlogPost[]> {
  if (!currentSlug.trim() || count <= 0) return [];

  const all = await fetchPosts();
  const current = all.find((post) => post.slug === currentSlug);
  if (!current) return [];

  return all
    .filter((candidate) => candidate.slug !== current.slug)
    .map((candidate) => ({ candidate, score: blogSemanticRelationScore(current, candidate) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return left.candidate.publishedDate < right.candidate.publishedDate ? 1 : -1;
    })
    .slice(0, count)
    .map(({ candidate }) => candidate);
}
