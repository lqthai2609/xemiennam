import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";
import { fetchRoutes } from "@/lib/api/routes";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchServices } from "@/lib/api/services";
import { fetchPosts } from "@/lib/api/blog";
import { vehicleCategories } from "@/data/vehicle-categories";
import { vehicleTypeSlug } from "@/types/route";

/**
 * Sitemap động (Ngày 23, mục 5 kiến trúc kỹ thuật) — tự sinh từ dữ liệu WP REST thật
 * (fetchRoutes/fetchVehicles/fetchServices/fetchPosts đã có sẵn cơ chế fallback mock từ
 * Ngày 12/13/17, nên sitemap không bao giờ rỗng dù WP chưa nhập liệu thật). KHÔNG dùng
 * sitemap của Rank Math bên WordPress — subdomain CMS đã chặn index (mục 1 kiến trúc kỹ thuật).
 *
 * lastModified: ưu tiên `modified` thật từ WordPress khi có; các trang tĩnh/trang tổ hợp
 * không có mốc modified riêng thì để trống (Next.js tự bỏ qua field này thay vì đoán bừa
 * "freshness giả" — đúng nguyên tắc mục 5, tránh lặp lỗi nhieuxe.vn ở mục 9.2).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [routes, vehicles, services, posts] = await Promise.all([
    fetchRoutes(),
    fetchVehicles(),
    fetchServices(),
    fetchPosts(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/tuyen-duong`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/doi-xe`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/loai-xe`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/dich-vu`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/bang-gia`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/khuyen-mai`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/danh-gia`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/lien-he`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const routeEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE_URL}/tuyen-duong/${route.slug}`,
    lastModified: route.modifiedDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Trang kết hợp tuyến × loại xe (Ngày 14) — sinh đúng những tổ hợp có thật trong pricingByVehicle,
  // giống hệt logic generateStaticParams() ở app/tuyen-duong/[slug]/[loai-xe]/page.tsx.
  const comboEntries: MetadataRoute.Sitemap = routes.flatMap((route) =>
    route.pricingByVehicle.map((vp) => ({
      url: `${SITE_URL}/tuyen-duong/${route.slug}/${vehicleTypeSlug(vp.vehicleType)}`,
      lastModified: route.modifiedDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  const vehicleEntries: MetadataRoute.Sitemap = vehicles.map((vehicle) => ({
    url: `${SITE_URL}/doi-xe/${vehicle.slug}`,
    lastModified: vehicle.modifiedDate,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const vehicleCategoryEntries: MetadataRoute.Sitemap = vehicleCategories.map((category) => ({
    url: `${SITE_URL}/loai-xe/${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const serviceEntries: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${SITE_URL}/dich-vu/${service.slug}`,
    lastModified: service.modifiedDate,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.modifiedDate,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...routeEntries,
    ...comboEntries,
    ...vehicleEntries,
    ...vehicleCategoryEntries,
    ...serviceEntries,
    ...postEntries,
  ];
}
