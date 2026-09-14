import type { LucideIcon } from "lucide-react";

export type ServiceIcon = "wedding" | "airport" | "monthly" | "city-tour";

export type ServiceVehicleType = {
  name: string;
  slug: string;
  description: string;
};

export type ServiceVehicle = {
  name: string;
  slug: string;
  detail: string;
};

/** Ngày 16: use case biên tập theo search intent của từng Service Pillar. */
export type ServiceUseCase = {
  title: string;
  description: string;
};

/** Ngày 16: link Route × Vehicle chỉ được sinh từ route và vehicle type thật. */
export type ServiceRouteComboLink = {
  vehicleType: string;
  href: string;
};

/** Ngày 16: route liên quan được derive từ giao cắt taxonomy vehicle_type. */
export type ServiceRelatedRoute = {
  name: string;
  href: string;
  summary: string;
  combos: ServiceRouteComboLink[];
};

export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  detailDescription: string;
  icon: ServiceIcon;
  iconLabel: string;
  /** Ảnh đại diện/hero — lấy từ featured image thật của WordPress khi có; dùng ảnh demo theo icon khi chưa gắn ảnh. */
  image?: string;
  vehicleTypes: ServiceVehicleType[];
  suggestedVehicles: ServiceVehicle[];
  notes: string[];
  hotline: string;
  /** Ngày 16 — intent riêng của Service Pillar; chỉ set khi có mapping biên tập rõ ràng. */
  searchIntent?: string;
  /** Ngày 16 — use case riêng; không tự sinh cho service chưa có contract. */
  useCases?: ServiceUseCase[];
  /** Ngày 16 — internal links Service → Route → Route × Vehicle từ entity thật. */
  relatedRoutes?: ServiceRelatedRoute[];
  /** `modified` thật từ WordPress (Ngày 23) — nhãn "Cập nhật lần cuối". Rỗng ở dữ liệu mock. */
  modifiedDate?: string;
  /** Rank Math SEO title/description, expose qua snippet WPCode ID 15 (Ngày 23). */
  rankMathTitle?: string;
  rankMathDescription?: string;
};

export type ServiceIconMap = Record<ServiceIcon, LucideIcon>;
