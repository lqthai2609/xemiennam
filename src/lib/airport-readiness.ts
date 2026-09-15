import { airportDisplayName } from "@/lib/airport-seo";

export type AirportReadinessPhase = "live" | "prelaunch";

export type AirportHubReadiness = {
  phase: AirportReadinessPhase;
  eyebrow: string;
  heroTitle: (airportName: string) => string;
  heroDescription: string;
  routeCountLabel: (count: number) => string;
  routesDescription: string;
  metadataTitle?: (airportName: string) => string;
  metadataDescription?: (airportName: string) => string;
};

const DEFAULT_AIRPORT_READINESS: AirportHubReadiness = {
  phase: "live",
  eyebrow: "Dịch vụ đưa đón sân bay",
  heroTitle: (airportName) => `Xe đưa đón ${airportDisplayName(airportName)} ↔ các tỉnh thành`,
  heroDescription:
    "Xe riêng có tài xế, hỗ trợ hành lý, phù hợp khách cá nhân, gia đình và nhóm công tác. Chọn tuyến liên tỉnh hai chiều và nhận báo giá rõ ràng từ Gocar VN.",
  routeCountLabel: (count) => `${count} tuyến đang mở`,
  routesDescription: "Giá và thông tin tuyến được cập nhật theo dữ liệu hiện có của Gocar VN.",
};

/**
 * Day 21 — Long Thành readiness policy.
 *
 * Trạng thái này CỐ Ý được quản lý thủ công thay vì tự chuyển sang "live" theo ngày.
 * Tại thời điểm 15/09/2026, nguồn Chính phủ công bố Long Thành đang trong giai đoạn
 * vận hành thử tháng 9–11/2026 và kế hoạch khai thác thương mại từ 01/12/2026.
 * Nếu lịch thực tế thay đổi, nội dung website không được tự suy diễn sân bay đã khai thác.
 * Chỉ đổi phase sau khi đã xác minh lại nguồn chính thức.
 */
const LONG_THANH_READINESS: AirportHubReadiness = {
  phase: "prelaunch",
  eyebrow: "Chuẩn bị dịch vụ đưa đón sân bay",
  heroTitle: (airportName) => `Chuẩn bị xe đưa đón ${airportDisplayName(airportName)} ↔ các tỉnh thành`,
  heroDescription:
    "Gocar VN đang chuẩn bị các tuyến đón và trả khách cho giai đoạn Sân bay Long Thành đi vào khai thác. Các tuyến hiển thị dùng để tham khảo nhu cầu và liên hệ trước; lịch khai thác thực tế cần đối chiếu thông báo chính thức.",
  routeCountLabel: (count) => `${count} tuyến đang chuẩn bị`,
  routesDescription:
    "Các tuyến dưới đây là dữ liệu chuẩn bị của Gocar VN. Tuyến chưa có giá xác minh sẽ hiển thị “Liên hệ báo giá”; không dùng giá suy đoán từ tuyến khác.",
  metadataTitle: () => "Xe Sân Bay Long Thành Đi Tỉnh — Thông Tin Chuẩn Bị | Gocar VN",
  metadataDescription: () =>
    "Gocar VN chuẩn bị các tuyến xe Sân bay Long Thành ↔ TP.HCM và các tỉnh. Xem tuyến dự kiến, liên hệ báo giá và đối chiếu lịch khai thác chính thức.",
};

export function getAirportHubReadiness(locationSlug: string): AirportHubReadiness {
  return locationSlug === "san-bay-long-thanh" ? LONG_THANH_READINESS : DEFAULT_AIRPORT_READINESS;
}

export function isPrelaunchAirportLocation(locationSlug: string | undefined): boolean {
  return locationSlug === "san-bay-long-thanh";
}

export function isPrelaunchAirportRoute(route: {
  originLocation?: { slug: string };
  destinationLocation?: { slug: string };
}): boolean {
  return (
    isPrelaunchAirportLocation(route.originLocation?.slug) ||
    isPrelaunchAirportLocation(route.destinationLocation?.slug)
  );
}
