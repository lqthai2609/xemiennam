import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";
import { fetchRoutes, fetchRegionSlugs } from "@/lib/api/routes";
import { fetchServices } from "@/lib/api/services";
import { fetchPosts } from "@/lib/api/blog";
import { fetchDiemDenBySlug } from "@/lib/api/diem-den";
import { getIndexableComboVehicleSlugs } from "@/lib/combo";
import { isPrelaunchAirportRoute } from "@/lib/airport-readiness";
import { vehicleCategories } from "@/data/vehicle-categories";
import { routeHref, routeComboHref } from "@/types/route";

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
  const [routes, services, posts, regionSlugs] = await Promise.all([
    fetchRoutes(),
    fetchServices(),
    fetchPosts(),
    fetchRegionSlugs(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/tuyen-duong`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/diem-den`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/loai-xe`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/dich-vu`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/bang-gia`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/khuyen-mai`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/danh-gia`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/lien-he`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Day 21: Airport Hub cũng phải theo data model, không hard-code riêng Tân Sơn Nhất.
  // Chỉ location type=airport đã thực sự xuất hiện trong ít nhất một Route Pair V2 mới có
  // entry /san-bay/[slug]. Cách này tự đưa Long Thành vào sitemap khi route readiness đã có,
  // đồng thời áp dụng được cho các sân bay tiếp theo mà không sửa danh sách tĩnh.
  const airportHubSlugs = Array.from(
    new Set(
      routes.flatMap((route) => {
        const slugs: string[] = [];
        for (const location of [route.originLocation, route.destinationLocation]) {
          if (location?.type === "airport") slugs.push(location.slug.replace(/^san-bay-/, ""));
        }
        return slugs;
      }),
    ),
  ).filter(Boolean);

  const airportHubEntries: MetadataRoute.Sitemap = airportHubSlugs.map((airportSlug) => ({
    url: `${SITE_URL}/san-bay/${airportSlug}`,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // Hub tỉnh /tuyen-duong/[tinh] (Ngày 25) — 1 entry/tỉnh có ít nhất 1 tuyến (fetchRegionSlugs()
  // đã loại tỉnh rỗng, xem lib/api/routes.ts). lastModified lấy từ bài `diem_den` nếu tỉnh đó đã
  // có nội dung biên tập; nhiều tỉnh sẽ chưa có (trang hub vẫn hợp lệ, chỉ thiếu mốc modified).
  const hubEntries: MetadataRoute.Sitemap = await Promise.all(
    regionSlugs.map(async (tinh) => {
      const hub = await fetchDiemDenBySlug(tinh);
      return {
        url: `${SITE_URL}/tuyen-duong/${tinh}`,
        lastModified: hub?.modifiedDate,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      };
    }),
  );

  // Route detail Long Thành vẫn render để QA/ghi nhận nhu cầu, nhưng Day 21 giữ noindex
  // cho tới khi trạng thái khai thác thương mại được xác minh. Do đó không đưa chúng vào sitemap.
  const indexableRoutes = routes.filter((route) => !isPrelaunchAirportRoute(route));
  const routeEntries: MetadataRoute.Sitemap = indexableRoutes.map((route) => ({
    url: `${SITE_URL}${routeHref(route)}`,
    lastModified: route.modifiedDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Day 14: combo chỉ xuất hiện trong sitemap khi cùng guard với metadata xác nhận:
  // route/vehicle hợp lệ + Pricing V2 renderable + nội dung CMS đủ minimum editorial threshold.
  // Day 21 bổ sung: route thuộc airport prelaunch cũng không sinh combo sitemap.
  const comboEntries: MetadataRoute.Sitemap = indexableRoutes.flatMap((route) =>
    getIndexableComboVehicleSlugs(route).map((vehicleSlug) => ({
      url: `${SITE_URL}${routeComboHref(route, vehicleSlug)}`,
      lastModified: route.modifiedDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

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
    ...airportHubEntries,
    ...hubEntries,
    ...routeEntries,
    ...comboEntries,
    ...vehicleCategoryEntries,
    ...serviceEntries,
    ...postEntries,
  ];
}
