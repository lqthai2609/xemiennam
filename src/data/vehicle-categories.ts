import type { VehicleCategory } from "@/types/vehicle-category";
export const vehicleCategories: VehicleCategory[] = [
  {
    slug: "4-cho", type: "4 chỗ", label: "4 CHỖ", title: "Xe 4 chỗ gọn gàng cho những chuyến đi riêng tư.", shortDescription: "Gia đình, cặp đôi, công tác", description: "Linh hoạt cho những hành trình cần sự riêng tư và tiện lợi.", color: "sand", driveOptions: ["Tự lái", "Có tài xế"], startingPrice: "Từ 900.000đ/ngày", audience: ["Gia đình nhỏ", "Cặp đôi", "Khách công tác"], amenities: ["Khoang xe thoải mái", "Điều hòa dễ chịu", "Đón trả tận nơi"],
  },
  {
    slug: "7-cho", type: "7 chỗ", label: "7 CHỖ", title: "Xe 7 chỗ rộng rãi cho gia đình và nhóm bạn.", shortDescription: "Gia đình, nhóm bạn, nhiều hành lý", description: "Không gian vừa đủ cho cả nhóm đi xa thoải mái và chủ động.", color: "gold", driveOptions: ["Tự lái", "Có tài xế", "Cả hai"], startingPrice: "Từ 1.100.000đ/ngày", audience: ["Gia đình có trẻ nhỏ", "Nhóm bạn", "Hành trình cuối tuần"], amenities: ["Cốp chứa hành lý", "Ghế ngả thoải mái", "Lịch trình linh hoạt"],
  },
  {
    slug: "16-cho", type: "16 chỗ", label: "16 CHỖ", title: "Xe 16 chỗ cho đoàn nhỏ đi cùng nhau.", shortDescription: "Đội nhóm, tour gia đình, công ty", description: "Gọn gàng, dễ sắp lịch cho các đoàn nhỏ và chuyến đi nhiều điểm.", color: "navy", driveOptions: ["Có tài xế"], startingPrice: "Từ 1.800.000đ/ngày", audience: ["Đoàn công ty", "Tour gia đình", "Nhóm từ 10 người"], amenities: ["Ghế ngả thoải mái", "Khoang hành lý riêng", "Tài xế quen đường"],
  },
  {
    slug: "29-cho", type: "29 chỗ", label: "29 CHỖ", title: "Xe 29 chỗ cân bằng giữa rộng rãi và linh hoạt.", shortDescription: "Tour đoàn, sự kiện, trường học", description: "Phù hợp đoàn vừa với nhu cầu di chuyển đồng bộ và thoải mái.", color: "orange", driveOptions: ["Có tài xế"], startingPrice: "Từ 2.400.000đ/ngày", audience: ["Đoàn tour", "Sự kiện", "Trường học"], amenities: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"],
  },
  {
    slug: "45-cho", type: "45 chỗ", label: "45 CHỖ", title: "Xe 45 chỗ cho những kế hoạch lớn.", shortDescription: "Hội nghị, tour lớn, đoàn thể", description: "Đủ rộng cho những lịch trình cần vận hành đồng bộ và chuyên nghiệp.", color: "navy", driveOptions: ["Có tài xế"], startingPrice: "Từ 3.200.000đ/ngày", audience: ["Đoàn từ 30 người", "Hội nghị", "Tour nhiều điểm đến"], amenities: ["Khoang hành lý lớn", "Điều hòa toàn xe", "Micro hướng dẫn"],
  },
  {
    slug: "limousine", type: "Limousine", label: "LIMOUSINE", title: "Limousine cho hành trình đáng nhớ hơn.", shortDescription: "Cao cấp, riêng tư, đường dài", description: "Khoang thương gia chỉn chu dành cho đoàn muốn đi xa thật thư thái.", color: "orange", driveOptions: ["Có tài xế"], startingPrice: "Từ 2.800.000đ/ngày", audience: ["Nghỉ dưỡng cao cấp", "Đón khách quan trọng", "Hành trình dài"], amenities: ["Ghế massage", "Màn hình riêng", "Cổng sạc từng ghế"],
  },
];

export function getVehicleCategory(slug: string) {
  return vehicleCategories.find((category) => category.slug === slug);
}
