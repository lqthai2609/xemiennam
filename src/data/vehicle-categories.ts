import type { VehicleCategory } from "@/types/vehicle-category";
import { buildPlaceholderImage } from "@/lib/placeholder-image";

/**
 * imageUrl hiện là ẢNH PLACEHOLDER TẠM (xem lib/placeholder-image.ts) — chỉ để test giao diện
 * ảnh hoạt động đúng. BẮT BUỘC thay bằng ảnh thật đại diện cho từng nhóm xe (ảnh xe thật do
 * anh Dúi chụp, hoặc ảnh stock đã mua bản quyền) trước khi đưa site lên domain thật.
 *
 * Ngày 25: tách "4–7 chỗ" và "16–29 chỗ" cũ thành 4 loại riêng (4/7/16/29 chỗ), khớp đúng
 * 6 term thật trong taxonomy vehicle_type của WordPress (slug/type/màu accent đồng bộ với
 * COLOR_BY_TYPE trong lib/api/vehicles.ts và VEHICLE_TYPE_ORDER trong lib/api/routes.ts).
 */
export const vehicleCategories: VehicleCategory[] = [
  {
    slug: "4-cho",
    type: "4 chỗ",
    label: "4 CHỖ",
    title: "Xe 4 chỗ gọn gàng cho những chuyến đi riêng tư.",
    shortDescription: "Gia đình, cặp đôi, công tác",
    description:
      "Linh hoạt cho những hành trình cần sự riêng tư và tiện lợi, phù hợp cả đi công tác lẫn nghỉ ngơi cuối tuần.",
    color: "sand",
    driveOptions: ["Tự lái", "Có tài xế"],
    startingPrice: "Từ 800.000đ/chuyến",
    imageUrl: buildPlaceholderImage("sand", "Ảnh xe 4 chỗ"),
    audience: ["Gia đình nhỏ", "Cặp đôi", "Khách công tác"],
    amenities: ["Khoang xe thoải mái", "Điều hòa dễ chịu", "Đón trả tận nơi"],
  },
  {
    slug: "7-cho",
    type: "7 chỗ",
    label: "7 CHỖ",
    title: "Xe 7 chỗ rộng rãi cho gia đình và nhóm bạn.",
    shortDescription: "Gia đình, nhóm bạn, nhiều hành lý",
    description:
      "Không gian vừa đủ cho cả nhóm đi xa thoải mái và chủ động, cốp rộng chứa được nhiều hành lý.",
    color: "gold",
    driveOptions: ["Tự lái", "Có tài xế"],
    startingPrice: "Từ 900.000đ/chuyến",
    imageUrl: buildPlaceholderImage("gold", "Ảnh xe 7 chỗ"),
    audience: ["Gia đình có trẻ nhỏ", "Nhóm bạn", "Hành trình cuối tuần"],
    amenities: ["Cốp chứa hành lý", "Ghế ngả thoải mái", "Lịch trình linh hoạt"],
  },
  {
    slug: "16-cho",
    type: "16 chỗ",
    label: "16 CHỖ",
    title: "Xe 16 chỗ cho đoàn nhỏ đi cùng nhau.",
    shortDescription: "Đội nhóm, tour gia đình, công ty",
    description:
      "Gọn gàng, dễ sắp lịch cho các đoàn nhỏ và chuyến đi nhiều điểm, đủ chỗ cho cả nhóm ngồi chung.",
    color: "navy",
    driveOptions: ["Có tài xế"],
    startingPrice: "Từ 1.700.000đ/chuyến",
    imageUrl: buildPlaceholderImage("navy", "Ảnh xe 16 chỗ"),
    audience: ["Đoàn công ty", "Tour gia đình", "Nhóm từ 10 người"],
    amenities: ["Ghế ngả thoải mái", "Khoang hành lý riêng", "Tài xế quen đường"],
  },
  {
    slug: "29-cho",
    type: "29 chỗ",
    label: "29 CHỖ",
    title: "Xe 29 chỗ cân bằng giữa rộng rãi và linh hoạt.",
    shortDescription: "Tour đoàn, sự kiện, trường học",
    description:
      "Phù hợp đoàn vừa với nhu cầu di chuyển đồng bộ và thoải mái, đủ rộng mà vẫn linh hoạt di chuyển trong phố.",
    color: "orange",
    driveOptions: ["Có tài xế"],
    startingPrice: "Từ 2.100.000đ/chuyến",
    imageUrl: buildPlaceholderImage("orange", "Ảnh xe 29 chỗ"),
    audience: ["Đoàn tour", "Sự kiện", "Trường học"],
    amenities: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"],
  },
  {
    slug: "45-cho",
    type: "45 chỗ",
    label: "45 CHỖ",
    title: "Xe 45 chỗ cho những kế hoạch lớn.",
    shortDescription: "Hội nghị, tour lớn, đoàn thể",
    description:
      "Đủ rộng cho hội nghị, trường học, tour đoàn và mọi lịch trình cần vận hành đồng bộ, chuyên nghiệp.",
    color: "navy",
    driveOptions: ["Có tài xế"],
    startingPrice: "Từ 2.500.000đ/chuyến",
    imageUrl: buildPlaceholderImage("navy", "Ảnh xe 45 chỗ"),
    audience: ["Đoàn từ 30 người", "Hội nghị", "Tour nhiều điểm đến"],
    amenities: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"],
  },
  {
    slug: "limousine",
    type: "Limousine",
    label: "LIMOUSINE",
    title: "Limousine cho hành trình đáng nhớ hơn.",
    shortDescription: "Cao cấp, riêng tư, đường dài",
    description:
      "Khoang thương gia chỉn chu dành cho đoàn muốn đi xa thật thư thái, riêng tư và khác biệt.",
    color: "orange",
    driveOptions: ["Có tài xế"],
    startingPrice: "Từ 1.900.000đ/chuyến",
    imageUrl: buildPlaceholderImage("orange", "Ảnh Limousine"),
    audience: ["Đoàn nghỉ dưỡng cao cấp", "Đón khách quan trọng", "Hành trình dài cần thư giãn"],
    amenities: ["Ghế massage", "Màn hình riêng", "Cổng sạc từng ghế"],
  },
];

export function getVehicleCategory(slug: string) {
  return vehicleCategories.find((category) => category.slug === slug);
}
