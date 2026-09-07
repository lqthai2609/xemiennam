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

export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  detailDescription: string;
  icon: ServiceIcon;
  iconLabel: string;
  /** Ảnh đại diện/hero từ CMS; dùng ảnh demo theo icon khi chưa có. */
  image?: string;
  vehicleTypes: ServiceVehicleType[];
  suggestedVehicles: ServiceVehicle[];
  notes: string[];
  hotline: string;
  /** `modified` thật từ WordPress (Ngày 23) — nhãn "Cập nhật lần cuối". Rỗng ở dữ liệu mock. */
  modifiedDate?: string;
  /** Rank Math SEO title/description, expose qua snippet WPCode ID 15 (Ngày 23). */
  rankMathTitle?: string;
  rankMathDescription?: string;
};

export type ServiceIconMap = Record<ServiceIcon, LucideIcon>;
