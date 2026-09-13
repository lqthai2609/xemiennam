import type { Testimonial } from "@/types/testimonial";
import type { Route } from "@/types/route";
import type { Vehicle } from "@/types/vehicle";
import { testimonials as mockTestimonials } from "@/data/testimonials";
import { fetchRawTestimonials, type WPTestimonial } from "./raw";
import { fetchRoutes } from "./routes";
import { fetchVehicles } from "./vehicles";
import { shouldUseMockFallback } from "./mock-fallback";
import { stripHtml } from "@/lib/wp";

const useMockFallback = shouldUseMockFallback();

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mapWPTestimonialToTestimonial(wp: WPTestimonial, routes: Route[], vehicles: Vehicle[]): Testimonial {
  const name = wp.title.rendered;
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
      console.warn("[fetchTestimonials] WP chưa có đánh giá nào — dùng dữ liệu mock theo policy môi trường.");
      return mockTestimonials;
    }
    return [];
  }
  const [routes, vehicles] = await Promise.all([fetchRoutes(), fetchVehicles()]);
  return raw.map((wp) => mapWPTestimonialToTestimonial(wp, routes, vehicles));
}
