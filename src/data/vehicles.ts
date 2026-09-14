import type { Vehicle } from "@/types/vehicle";
import { buildPlaceholderImage } from "@/lib/placeholder-image";

/**
 * images hiện là ẢNH PLACEHOLDER TẠM (xem lib/placeholder-image.ts) — chỉ để test giao
 * diện ảnh hoạt động đúng, KHÔNG phải ảnh xe thật của Xe Miền Nam. BẮT BUỘC thay bằng ảnh
 * thật (anh Dúi tự chụp, hoặc ảnh stock đã mua bản quyền) khi nhập dữ liệu thật Ngày 24 —
 * khi đó nối qua wp.meta.gallery_anh, không còn dùng mảng cứng ở đây nữa.
 * 
 * UPDATE Ngày 25: Đã cập nhật các type để khớp với 6 loại xe trong vehicle-categories.ts:
 * thay "4–7 chỗ" → "4 chỗ" / "7 chỗ"
 * thay "16–29 chỗ" → "16 chỗ" / "29 chỗ"
 */

export const vehicles: Vehicle[] = [
  {
    id: "sedan-4",
    slug: "sedan-4",
    name: "Toyota Camry",
    type: "4 chỗ",
    seats: "4 chỗ",
    capacity: "2 vali lớn",
    description: "Êm ái, riêng tư và lịch sự cho lịch trình công tác hoặc đi chơi cặp đôi.",
    color: "sand",
    imageLabel: "Ảnh xe 4 chỗ Toyota Camry",
    images: [buildPlaceholderImage("sand", "Ảnh xe 4 chỗ")],
    features: ["Điều hòa dễ chịu", "Khoang thoải mái", "Đón trả tận nơi"],
    driverIncluded: false,
    routePrices: [
      { route: "TP.HCM → Vũng Tàu", price: "140K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Cần Thơ", price: "180K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Đà Lạt", price: "290K", note: "Giá 1 chuyến" },
    ],
  },
  {
    id: "family-mpv-7",
    slug: "family-mpv-7",
    name: "Toyota Innova",
    type: "7 chỗ",
    seats: "7 chỗ",
    capacity: "4 vali lớn",
    description: "Không gian rộng rãi cho gia đình, nhóm bạn muốn đi xa với sự thoải mái.",
    color: "gold",
    imageLabel: "Ảnh xe 7 chỗ Toyota Innova",
    images: [buildPlaceholderImage("gold", "Ảnh xe 7 chỗ")],
    features: ["Cốp chứa hành lý", "Ghế ngả thoải mái", "Lịch trình linh hoạt"],
    driverIncluded: false,
    routePrices: [
      { route: "TP.HCM → Vũng Tàu", price: "180K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Cần Thơ", price: "220K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Đà Lạt", price: "350K", note: "Giá 1 chuyến" },
    ],
  },
  {
    id: "sprinter-16",
    slug: "sprinter-16",
    name: "Mercedes Sprinter",
    type: "16 chỗ",
    seats: "16 chỗ",
    capacity: "16 vali lớn",
    description: "Lựa chọn gọn gàng cho nhóm công ty hoặc tour nhỏ, dễ di chuyển trong phố.",
    color: "navy",
    imageLabel: "Ảnh xe 16 chỗ Mercedes Sprinter",
    images: [buildPlaceholderImage("navy", "Ảnh xe 16 chỗ")],
    features: ["Ghế ngả thoải mái", "Khoang hành lý riêng", "Tài xế quen đường"],
    driverIncluded: true,
    routePrices: [
      { route: "TP.HCM → Vũng Tàu", price: "500K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Cần Thơ", price: "650K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Phan Thiết", price: "800K", note: "Giá 1 chuyến" },
    ],
  },
  {
    id: "coach-29",
    slug: "coach-29",
    name: "Thaco Transit",
    type: "29 chỗ",
    seats: "29 chỗ",
    capacity: "29 vali lớn",
    description: "Phù hợp đoàn vừa với nhu cầu di chuyển đồng bộ, cân bằng rộng rãi và linh hoạt.",
    color: "orange",
    imageLabel: "Ảnh xe 29 chỗ Thaco Transit",
    images: [buildPlaceholderImage("orange", "Ảnh xe 29 chỗ")],
    features: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"],
    driverIncluded: true,
    routePrices: [
      { route: "TP.HCM → Vũng Tàu", price: "850K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Cần Thơ", price: "1.100K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Phan Thiết", price: "1.300K", note: "Giá 1 chuyến" },
    ],
  },
  {
    id: "coach-45",
    slug: "coach-45",
    name: "Thaco Universe",
    type: "45 chỗ",
    seats: "45 chỗ",
    capacity: "45 vali lớn",
    description: "Đủ rộng cho hội nghị, trường học, tour đoàn lớn cần di chuyển chuyên nghiệp.",
    color: "navy",
    imageLabel: "Ảnh xe 45 chỗ Thaco Universe",
    images: [buildPlaceholderImage("navy", "Ảnh xe 45 chỗ")],
    features: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"],
    driverIncluded: true,
    routePrices: [
      { route: "TP.HCM → Vũng Tàu", price: "1.450K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Cần Thơ", price: "1.900K", note: "Giá 1 chuyến" },
    ],
  },
  {
    id: "limousine-22",
    slug: "limousine-22",
    name: "Dcar Limousine",
    type: "Limousine",
    seats: "22 chỗ",
    capacity: "22 vali lớn",
    description: "Khoang thương gia cho đoàn muốn đi xa thật thư thái, riêng tư và khác biệt.",
    color: "orange",
    imageLabel: "Ảnh Limousine Dcar",
    images: [buildPlaceholderImage("orange", "Ảnh Limousine")],
    features: ["Ghế massage", "Màn hình riêng", "Cổng sạc từng ghế"],
    driverIncluded: true,
    routePrices: [
      { route: "TP.HCM → Vũng Tàu", price: "320K", note: "Giá 1 chuyến" },
      { route: "TP.HCM → Đà Lạt", price: "450K", note: "Giá 1 chuyến" },
    ],
  },
];

export function getVehicleBySlug(slug: string) {
  return vehicles.find((vehicle) => vehicle.slug === slug);
}

export function getSimilarVehicles(currentSlug: string, count = 3) {
  const current = vehicles.find((vehicle) => vehicle.slug === currentSlug);
  const others = vehicles.filter((vehicle) => vehicle.slug !== currentSlug);
  if (!current) return others.slice(0, count);
  // Ưu tiên cùng loại xe (vehicle_type) trước, sau đó mới lấy thêm loại khác cho đủ số lượng.
  const sameType = others.filter((vehicle) => vehicle.type === current.type);
  const rest = others.filter((vehicle) => vehicle.type !== current.type);
  return [...sameType, ...rest].slice(0, count);
}
