import type { Vehicle } from "@/types/vehicle";

export type VehicleCategory = {
  slug: string;
  label: string;
  title: string;
  description: string;
  color: Vehicle["color"];
  audience: string[];
  amenities: string[];
  vehicleSlugs: string[];
  routeLinks: { label: string; href: string }[];
  services: { title: string; description: string; href: string }[];
};

export const vehicleCategories: VehicleCategory[] = [
  { slug: "xe-gia-dinh", label: "4–7 CHỖ", title: "Xe gia đình cho những chuyến đi vừa đủ riêng tư.", description: "Từ chuyến về quê cuối tuần đến hành trình nghỉ dưỡng dài ngày, nhóm xe gia đình mang đến sự thoải mái và linh hoạt cho cả nhà.", color: "sand", audience: ["Gia đình nhỏ và nhóm bạn", "Đón trả tận nơi", "Lịch trình linh hoạt"], amenities: ["Khoang xe rộng rãi", "Điều hòa dễ chịu", "Cốp chứa hành lý tiện lợi"], vehicleSlugs: ["family-mpv", "premium-sedan"], routeLinks: [{ label: "TP. Hồ Chí Minh → Vũng Tàu", href: "/tuyen-duong" }, { label: "TP. Hồ Chí Minh → Đà Lạt", href: "/tuyen-duong" }], services: [{ title: "Thuê xe đi tỉnh", description: "Chủ động điểm đón, điểm trả và thời gian nghỉ dọc đường.", href: "/#booking" }, { title: "Đón sân bay", description: "Đón đúng giờ, hỗ trợ hành lý cho cả gia đình.", href: "/#booking" }] },
  { slug: "xe-doan-nho", label: "16–29 CHỖ", title: "Xe đoàn nhỏ để cả nhóm đi cùng nhau.", description: "Gọn gàng, thoải mái và dễ sắp lịch cho công ty, tour gia đình hoặc nhóm bạn đông người.", color: "gold", audience: ["Đoàn từ 10–25 người", "Tour gia đình và công ty", "Cần tài xế quen đường"], amenities: ["Ghế ngả thoải mái", "Wifi và cổng sạc", "Khoang hành lý riêng"], vehicleSlugs: ["sprinter-16"], routeLinks: [{ label: "TP. Hồ Chí Minh → Đà Lạt", href: "/tuyen-duong" }, { label: "TP. Hồ Chí Minh → Vũng Tàu", href: "/tuyen-duong" }], services: [{ title: "Xe tour trọn gói", description: "Một đầu mối cho xe, tài xế và lịch trình của đoàn.", href: "/#booking" }, { title: "Xe sự kiện", description: "Điều phối đón trả theo nhiều điểm tập trung.", href: "/#booking" }] },
  { slug: "xe-limousine", label: "LIMOUSINE", title: "Limousine cho hành trình đáng nhớ hơn.", description: "Khoang thương gia chỉn chu dành cho đoàn muốn đi xa thật thư thái, riêng tư và khác biệt.", color: "orange", audience: ["Đoàn nghỉ dưỡng cao cấp", "Đón khách quan trọng", "Hành trình dài cần thư giãn"], amenities: ["Ghế massage", "Màn hình riêng", "Cổng sạc từng ghế"], vehicleSlugs: ["limousine-22"], routeLinks: [{ label: "TP. Hồ Chí Minh → Đà Lạt", href: "/tuyen-duong" }, { label: "TP. Hồ Chí Minh → Phan Thiết", href: "/tuyen-duong" }], services: [{ title: "Đón khách VIP", description: "Không gian riêng tư và dịch vụ đón tiếp chỉn chu.", href: "/#booking" }] },
  { slug: "xe-doan-lon", label: "45 CHỖ", title: "Xe đoàn lớn cho những kế hoạch lớn.", description: "Đủ rộng cho hội nghị, trường học, tour đoàn và mọi lịch trình cần vận hành đồng bộ.", color: "navy", audience: ["Đoàn từ 30 người", "Hội nghị và trường học", "Tour nhiều điểm đến"], amenities: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"], vehicleSlugs: ["coach-45"], routeLinks: [{ label: "TP. Hồ Chí Minh → Vũng Tàu", href: "/tuyen-duong" }, { label: "TP. Hồ Chí Minh → Cần Thơ", href: "/tuyen-duong" }], services: [{ title: "Xe hội nghị", description: "Điều phối đoàn đông người đúng giờ và đúng điểm.", href: "/#booking" }, { title: "Xe trường học", description: "Lịch trình rõ ràng, tài xế giàu kinh nghiệm.", href: "/#booking" }] },
];

export function getVehicleCategory(slug: string) { return vehicleCategories.find((category) => category.slug === slug); }
export function getCategoryVehicles(category: VehicleCategory, vehicles: Vehicle[]) { return category.vehicleSlugs.map((slug) => vehicles.find((vehicle) => vehicle.slug === slug)).filter((vehicle): vehicle is Vehicle => Boolean(vehicle)); }
