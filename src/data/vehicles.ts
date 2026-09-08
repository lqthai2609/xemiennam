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
  { id: "sedan-4", slug: "sedan-4", name: "Toyota Camry", type: "4 chỗ", seats: "4 chỗ", capacity: "2 vali lớn", description: "Êm ái, riêng tư và lịch sự cho lịch trình công tác hoặc đi chơi cặp đôi." },
  { id: "family-mpv-7", slug: "family-mpv-7", name: "Toyota Innova", type: "7 chỗ", seats: "7 chỗ", capacity: "4 vali lớn", description: "Không gian rộng rãi cho gia đình, nhóm bạn muốn đi xa với sự thoải mái." },
  { id: "sprinter-16", slug: "sprinter-16", name: "Mercedes Sprinter", type: "16 chỗ", seats: "16 chỗ", capacity: "16 vali lớn", description: "Lựa chọn gọn gàng cho nhóm công ty hoặc tour nhỏ, dễ di chuyển trong phố." },
  { id: "coach-29", slug: "coach-29", name: "Thaco Transit", type: "29 chỗ", seats: "29 chỗ", capacity: "29 vali lớn", description: "Phù hợp đoàn vừa với nhu cầu di chuyển đồng bộ, cân bằng rộng rãi và linh hoạt." },
  { id: "coach-45", slug: "coach-45", name: "Thaco Universe", type: "45 chỗ", seats: "45 chỗ", capacity: "45 vali lớn", description: "Đủ rộng cho hội nghị, trường học, tour đoàn lớn cần di chuyển chuyên nghiệp." },
  { id: "limousine-22", slug: "limousine-22", name: "Dcar Limousine", type: "Limousine", seats: "22 chỗ", capacity: "22 vali lớn", description: "Khoang thương gia cho đoàn muốn đi xa thật thư thái, riêng tư và khác biệt." },
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
