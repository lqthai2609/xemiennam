import type { BlogPost } from "@/types/blog";

/** Ảnh minh họa dự phòng chỉ dựa trên quan hệ CMS; không thay featured image. */
export function blogIllustration(post: Pick<BlogPost, "featuredImageUrl" | "airportLocationIds" | "provinceSlugs" | "vehicleTypeSlugs">): string {
  if (post.featuredImageUrl) return post.featuredImageUrl;
  if (post.airportLocationIds.length) return "/images/services/airport.png";
  if (post.provinceSlugs.includes("dong-nai")) return "/images/destinations/dong-nai.webp";
  if (!post.provinceSlugs.length && post.vehicleTypeSlugs.length) return "/images/home-vehicle-trio.webp";
  return "/images/home-coastal-fleet.webp";
}
