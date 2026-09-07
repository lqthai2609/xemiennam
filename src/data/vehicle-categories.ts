import type { VehicleCategory } from "@/types/vehicle-category";
import { buildPlaceholderImage } from "@/lib/placeholder-image";

/**
 * imageUrl hiện là ẢNH PLACEHOLDER TẠM (xem lib/placeholder-image.ts) — chỉ để test giao diện
 * ảnh hoạt động đúng. BẮT BUỘC thay bằng ảnh thật đại diện cho từng nhóm xe (ảnh xe thật do
 * anh Dúi chụp, hoặc ảnh stock đã mua bản quyền) trước khi đưa site lên domain thật.
 */
export const vehicleCategories: VehicleCategory[] = [
  {
    slug: "4-7-cho",
    type: "4–7 chỗ",
    label: "4–7 CHỖ",
    title: "Xe gia đình cho những chuyến đi vừa đủ riêng tư.",
    description:
      "Từ chuyến về quê cuối tuần đến hành trình nghỉ dưỡng dài ngày, nhóm xe gia đình mang đến sự thoải mái và linh hoạt cho cả nhà.",
    color: "sand",
    imageUrl: buildPlaceholderImage("sand", "Ảnh xe 4-7 chỗ"),
    audience: ["Gia đình nhỏ và nhóm bạn", "Đón trả tận nơi", "Lịch trình linh hoạt"],
    amenities: ["Khoang xe rộng rãi", "Điều hòa dễ chịu", "Cốp chứa hành lý tiện lợi"],
  },
  {
    slug: "16-29-cho",
    type: "16–29 chỗ",
    label: "16–29 CHỖ",
    title: "Xe đoàn nhỏ để cả nhóm đi cùng nhau.",
    description:
      "Gọn gàng, thoải mái và dễ sắp lịch cho công ty, tour gia đình hoặc nhóm bạn đông người.",
    color: "gold",
    imageUrl: buildPlaceholderImage("gold", "Ảnh xe 16-29 chỗ"),
    audience: ["Đoàn từ 10–25 người", "Tour gia đình và công ty", "Cần tài xế quen đường"],
    amenities: ["Ghế ngả thoải mái", "Wifi và cổng sạc", "Khoang hành lý riêng"],
  },
  {
    slug: "45-cho",
    type: "45 chỗ",
    label: "45 CHỖ",
    title: "Xe đoàn lớn cho những kế hoạch lớn.",
    description:
      "Đủ rộng cho hội nghị, trường học, tour đoàn và mọi lịch trình cần vận hành đồng bộ.",
    color: "navy",
    imageUrl: buildPlaceholderImage("navy", "Ảnh xe 45 chỗ"),
    audience: ["Đoàn từ 30 người", "Hội nghị và trường học", "Tour nhiều điểm đến"],
    amenities: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"],
  },
  {
    slug: "limousine",
    type: "Limousine",
    label: "LIMOUSINE",
    title: "Limousine cho hành trình đáng nhớ hơn.",
    description:
      "Khoang thương gia chỉn chu dành cho đoàn muốn đi xa thật thư thái, riêng tư và khác biệt.",
    color: "orange",
    imageUrl: buildPlaceholderImage("orange", "Ảnh Limousine"),
    audience: ["Đoàn nghỉ dưỡng cao cấp", "Đón khách quan trọng", "Hành trình dài cần thư giãn"],
    amenities: ["Ghế massage", "Màn hình riêng", "Cổng sạc từng ghế"],
  },
];

export function getVehicleCategory(slug: string) {
  return vehicleCategories.find((category) => category.slug === slug);
}
