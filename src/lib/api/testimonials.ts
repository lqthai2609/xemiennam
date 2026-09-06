import type { Testimonial } from "@/types/testimonial";
import type { Route } from "@/types/route";
import type { Vehicle } from "@/types/vehicle";
import { testimonials as mockTestimonials } from "@/data/testimonials";
import { fetchRawTestimonials, type WPTestimonial } from "./raw";
import { fetchRoutes } from "./routes";
import { fetchVehicles } from "./vehicles";
import { stripHtml } from "@/lib/wp";

/**
 * fetchTestimonials() — Ngày 18.
 * Cùng chiến lược fallback mock như các hàm fetch khác (Ngày 12/13): WP chưa có bài
 * `testimonial` nào (nhập liệu thật dời tới Ngày 27), nên khi API trả về rỗng, dùng lại
 * data/testimonials.ts — mảng này cũng đang được ComboLandingPage (Ngày 14) dùng qua
 * getTestimonialsForCombo(), nên giữ đúng shape Testimonial để không phá trang đó.
 * Đổi `useMockFallback` thành false để thấy đúng trạng thái CMS thật.
 */
const useMockFallback = true;

/** "Thu Hằng" → "TH". Chỉ 1 từ (vd "Yến") → 2 ký tự đầu, viết hoa. */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mapWPTestimonialToTestimonial(wp: WPTestimonial, routes: Route[], vehicles: Vehicle[]): Testimonial {
  const name = wp.title.rendered;
  // route_lien_quan/vehicle_lien_quan là quan hệ thật (select_single_post) — không phải text tự do,
  // đúng nguyên tắc mục 3 kiến trúc kỹ thuật. Join theo ID với route/vehicle đã fetch để ra đúng
  // slug/type hiển thị (routeSlug/vehicleType), giữ nguyên shape Testimonial hiện có.
  const routeId = wp.meta.route_lien_quan != null ? String(wp.meta.route_lien_quan) : undefined;
  const vehicleId = wp.meta.vehicle_lien_quan != null ? String(wp.meta.vehicle_lien_quan) : undefined;

  return {
    id: String(wp.id),
    name,
    initials: initialsFromName(name),
    rating: wp.meta.so_sao ?? 5,
    quote: stripHtml(wp.content?.rendered),
    routeSlug: routeId ? routes.find((r) => r.id === routeId)?.slug : undefined,
    vehicleType: vehicleId ? vehicles.find((v) => v.id === vehicleId)?.type : undefined,
    date: wp.date,
  };
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const raw = await fetchRawTestimonials();
  if (raw.length === 0) {
    if (useMockFallback) {
      console.warn("[fetchTestimonials] WP chưa có đánh giá nào — dùng dữ liệu mock tạm (xem ghi chú trong testimonials.ts).");
      return mockTestimonials;
    }
    return [];
  }
  const [routes, vehicles] = await Promise.all([fetchRoutes(), fetchVehicles()]);
  return raw.map((wp) => mapWPTestimonialToTestimonial(wp, routes, vehicles));
}
