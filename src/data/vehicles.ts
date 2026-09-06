import type { Vehicle } from "@/types/vehicle";

export const vehicles: Vehicle[] = [
  { id: "family-mpv", slug: "family-mpv", name: "Toyota Innova", type: "4–7 chỗ", seats: "7 chỗ", capacity: "4 vali lớn", description: "Không gian rộng rãi cho gia đình, nhóm bạn và những chuyến đi cần sự riêng tư.", badge: "Được chọn nhiều", color: "sand", imageLabel: "Toyota Innova màu trắng bạc", features: ["Điều hòa 2 vùng", "Cốp rộng", "Ghế ngả thoải mái"], driverIncluded: false, routePrices: [{ route: "TP. Hồ Chí Minh → Vũng Tàu", price: "1.450K", note: "Trọn gói 1 chiều" }, { route: "TP. Hồ Chí Minh → Đà Lạt", price: "3.200K", note: "Có thể dừng nghỉ theo lịch trình" }, { route: "TP. Hồ Chí Minh → Cần Thơ", price: "1.800K", note: "Đón trả tận nơi" }] },
  { id: "premium-sedan", slug: "premium-sedan", name: "Toyota Camry", type: "4–7 chỗ", seats: "4 chỗ", capacity: "2 vali lớn", description: "Êm ái, riêng tư và lịch sự cho lịch công tác, đón khách hoặc chuyến đi đôi.", badge: "Êm ái nhất", color: "navy", imageLabel: "Toyota Camry màu xanh đậm", features: ["Ghế da cao cấp", "Cách âm tốt", "Sạc USB-C"], driverIncluded: true, routePrices: [{ route: "TP. Hồ Chí Minh → Vũng Tàu", price: "1.650K", note: "Trọn gói 1 chiều" }, { route: "TP. Hồ Chí Minh → Phan Thiết", price: "2.400K", note: "Đón trả tận nơi" }] },
  { id: "sprinter-16", slug: "sprinter-16", name: "Mercedes Sprinter", type: "16–29 chỗ", seats: "16 chỗ", capacity: "16 vali lớn", description: "Lựa chọn gọn gàng cho nhóm công ty, tour gia đình và đoàn cần linh hoạt.", badge: "Cho đoàn nhỏ", color: "gold", imageLabel: "Mercedes Sprinter 16 chỗ", features: ["Ghế ngả", "Wifi 4G", "Khoang hành lý riêng"], driverIncluded: true, routePrices: [{ route: "TP. Hồ Chí Minh → Vũng Tàu", price: "2.800K", note: "Trọn gói 1 chiều" }, { route: "TP. Hồ Chí Minh → Đà Lạt", price: "5.500K", note: "Tài xế quen cung đường đèo" }] },
  { id: "limousine-22", slug: "limousine-22", name: "Dcar Limousine", type: "Limousine", seats: "22 chỗ", capacity: "22 vali lớn", description: "Khoang thương gia cho đoàn muốn đi xa thật thoải mái và chỉn chu.", badge: "Nâng tầm hành trình", color: "orange", imageLabel: "Dcar Limousine 22 chỗ", features: ["Ghế massage", "Màn hình riêng", "Cổng sạc từng ghế"], driverIncluded: true, routePrices: [{ route: "TP. Hồ Chí Minh → Đà Lạt", price: "7.500K", note: "Trọn gói 1 chiều" }, { route: "TP. Hồ Chí Minh → Phan Thiết", price: "4.800K", note: "Phù hợp đoàn nghỉ dưỡng" }] },
  { id: "coach-45", slug: "coach-45", name: "Thaco Universe", type: "45 chỗ", seats: "45 chỗ", capacity: "45 vali lớn", description: "Đủ rộng cho hội nghị, trường học, tour đoàn và những chuyến đi nhiều người.", color: "navy", imageLabel: "Thaco Universe 45 chỗ", features: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"], driverIncluded: true, routePrices: [{ route: "TP. Hồ Chí Minh → Vũng Tàu", price: "5.500K", note: "Trọn gói 1 chiều" }, { route: "TP. Hồ Chí Minh → Cần Thơ", price: "6.800K", note: "Đón tại một điểm tập trung" }] },
];

export function getVehicleBySlug(slug: string) { return vehicles.find((vehicle) => vehicle.slug === slug); }
export function getSimilarVehicles(currentSlug: string, count = 3) {
  const current = vehicles.find((vehicle) => vehicle.slug === currentSlug);
  const others = vehicles.filter((vehicle) => vehicle.slug !== currentSlug);
  if (!current) return others.slice(0, count);
  // Ưu tiên cùng loại xe (vehicle_type) trước, sau đó mới lấy thêm loại khác cho đủ số lượng.
  const sameType = others.filter((vehicle) => vehicle.type === current.type);
  const rest = others.filter((vehicle) => vehicle.type !== current.type);
  return [...sameType, ...rest].slice(0, count);
}
