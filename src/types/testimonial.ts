export type Testimonial = {
  id: string;
  name: string;
  initials: string;
  /** 1–5 sao. */
  rating: number;
  quote: string;
  /** Khớp Route.slug — để lọc đúng ngữ cảnh hiển thị (relationship trong CPT testimonial thật, Ngày 18). */
  routeSlug?: string;
  /** Khớp VehiclePrice.vehicleType / Vehicle.type. */
  vehicleType?: string;
};
