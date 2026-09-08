import { Route } from "@/types/route";
import { buildRouteMapEmbedSrc } from "@/lib/maps";

/**
 * Dữ liệu mock DUY NHẤT cho toàn bộ tuyến — dùng ở trang chủ, /tuyen-duong,
 * và /tuyen-duong/[slug]. Khi nối WP REST API thật (Ngày 12), thay import
 * này bằng fetchRoutes()/getPricingTable() nhưng giữ nguyên shape Route.
 * 
 * UPDATE Ngày 25: Đã cập nhật vehicleTypes và seatCount để khớp với 6 loại xe:
 * thay "4–7 chỗ" → "4 chỗ", "7 chỗ"
 * thay "16–29 chỗ" → "16 chỗ", "29 chỗ"
 */
export const routes: Route[] = [
  {
    id: "hcm-vung-tau",
    slug: "hcm-vung-tau",
    from: "TP. Hồ Chí Minh",
    to: "Vũng Tàu",
    region: "Vũng Tàu",
    regionSlug: "ba-ria-vung-tau",
    time: "2h 15m",
    distance: "125 km",
    price: "140K",
    vehicleTypes: ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ", "Limousine"],
    seatCount: ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4 chỗ", price: "140K", comboDescription: "Xe 4 chỗ đi Vũng Tàu hợp cho gia đình hoặc cặp đôi nhỏ muốn chủ động giờ giấc, ghé Bãi Sau bu..." },
      { vehicleType: "7 chỗ", price: "180K", comboDescription: "Xe 7 chỗ đi Vũng Tàu phù hợp cho gia đình lớn hoặc nhóm bạn, có khoang hành lý rộng..." },
      { vehicleType: "16 chỗ", price: "500K", comboDescription: "Xe 16 chỗ cho nhóm công ty hoặc đoàn nhỏ đi Vũng Tàu, gọn gàng và linh hoạt..." },
      { vehicleType: "29 chỗ", price: "850K", comboDescription: "Xe 29 chỗ cho đoàn trung bình hoặc lớp học đi Vũng Tàu, đủ chỗ để cả đoàn ngồi chung..." },
      { vehicleType: "45 chỗ", price: "1.450K", comboDescription: "Xe 45 chỗ phù hợp cho đoàn lớn, hội nhóm hoặc trường học tổ chức chuyến dã ngoại Vũng Tàu trong n..." },
      { vehicleType: "Limousine", price: "320K", comboDescription: "Limousine đi Vũng Tàu dành cho ai muốn khoang ghế êm hơn, phù hợp đón khách hoặc đi cùng gia đình có ngư..." },
    ],
    pickupPoints: ["Quận 1", "Quận 3", "TP. Thủ Đức", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Bãi Sau", "Bãi Trước", "Trung tâm Vũng Tàu", "Long Hải"],
    mapEmbedSrc: buildRouteMapEmbedSrc("TP. Hồ Chí Minh", "Vũng Tàu"),
    summary: "Từ nhịp sống thành phố đến biển xanh cuối tuần — đón tận nơi, trả đúng điểm.",
    heroNote: "Tuyến biển được yêu thích nhất miền Nam",
    departures: ["06:00", "08:00", "10:00", "13:30", "16:00"],
    notes: ["Đón tận nhà trong khu vực nội thành", "Không phụ thu cuối tuần", "Có xe riêng cho gia đình và nhóm nhỏ"],
  },
  {
    id: "hcm-can-tho",
    slug: "hcm-can-tho",
    from: "TP. Hồ Chí Minh",
    to: "Cần Thơ",
    region: "Cần Thơ",
    regionSlug: "can-tho",
    time: "3h 30m",
    distance: "170 km",
    price: "180K",
    vehicleTypes: ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ"],
    seatCount: ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4 chỗ", price: "180K", comboDescription: "Xe 4 chỗ về Cần Thơ tiện cho cặp đôi hoặc gia đình nhỏ muốn ghé chợ nổi Cái Răng sớm..." },
      { vehicleType: "7 chỗ", price: "220K", comboDescription: "Xe 7 chỗ về Cần Thơ phù hợp cho gia đình đi tham quan miền Tây, có khoang hành lý..." },
      { vehicleType: "16 chỗ", price: "650K", comboDescription: "Xe 16 chỗ về Cần Thơ cho nhóm công ty hoặc tour nhỏ tham quan miền Tây..." },
      { vehicleType: "29 chỗ", price: "1.100K", comboDescription: "Xe 29 chỗ về Cần Thơ phù hợp cho đoàn tham quan miền Tây, có khoang hành lý đủ rộng..." },
      { vehicleType: "45 chỗ", price: "1.900K", comboDescription: "Xe 45 chỗ về Cần Thơ dành cho đoàn công ty hoặc tour lớn cần một xe duy nhất cho cả nhóm." },
    ],
    pickupPoints: ["Quận 1", "Quận 5", "Bình Thạnh", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Ninh Kiều", "Cái Răng", "Ô Môn", "Bến xe Cần Thơ"],
    mapEmbedSrc: buildRouteMapEmbedSrc("TP. Hồ Chí Minh", "Cần Thơ"),
    summary: "Về miền Tây nhẹ nhàng, đúng giờ với những chuyến xe thoải mái mỗi ngày.",
    heroNote: "Kết nối thành phố với miền sông nước",
    departures: ["05:30", "07:30", "09:30", "12:30", "15:30"],
    notes: ["Có khoang hành lý rộng", "Hỗ trợ gửi hàng nhỏ đi cùng chuyến", "Đặt trước để chọn điểm đón thuận tiện"],
  },
  {
    id: "hcm-da-lat",
    slug: "hcm-da-lat",
    from: "TP. Hồ Chí Minh",
    to: "Đà Lạt",
    region: "Đà Lạt",
    regionSlug: "da-lat",
    time: "6h 30m",
    distance: "300 km",
    price: "290K",
    vehicleTypes: ["4 chỗ", "7 chỗ", "Limousine"],
    seatCount: ["4 chỗ", "7 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4 chỗ", price: "290K", comboDescription: "Xe 4 chỗ lên Đà Lạt hợp cho cặp đôi muốn dừng chân dọc đường đèo, chủ động thời gian nghỉ..." },
      { vehicleType: "7 chỗ", price: "350K", comboDescription: "Xe 7 chỗ lên Đà Lạt phù hợp cho gia đình hoặc nhóm bạn nhỏ muốn ghé nhiều điểm dọc đường..." },
      { vehicleType: "Limousine", price: "450K", comboDescription: "Limousine lên Đà Lạt có ghế nằm êm cho hành trình dài, phù hợp đi đêm để sáng hôm sau có trọn ngày..." },
    ],
    pickupPoints: ["Quận 1", "Quận 3", "Quận 10", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Trung tâm Đà Lạt", "Hồ Xuân Hương", "Bến xe liên tỉnh", "Đức Trọng"],
    mapEmbedSrc: buildRouteMapEmbedSrc("TP. Hồ Chí Minh", "Đà Lạt"),
    summary: "Lên cao nguyên trong khoang xe êm ái, để đoạn đường dài trở thành một phần của chuyến đi.",
    heroNote: "Hành trình cao nguyên cho những ngày cần nghỉ ngơi",
    departures: ["06:30", "08:30", "11:00", "20:30", "22:00"],
    notes: ["Limousine ghế massage cho tuyến dài", "Có chuyến đêm tiện nghỉ ngơi", "Tài xế quen cung đường đèo"],
  },
  {
    id: "hcm-phan-thiet",
    slug: "hcm-phan-thiet",
    from: "TP. Hồ Chí Minh",
    to: "Phan Thiết",
    region: "Phan Thiết",
    regionSlug: "phan-thiet",
    time: "3h 45m",
    distance: "200 km",
    price: "220K",
    vehicleTypes: ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ"],
    seatCount: ["4 chỗ", "7 chỗ", "16 chỗ", "29 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4 chỗ", price: "220K", comboDescription: "Xe 4 chỗ ra Mũi Né hợp cho cặp đôi hoặc gia đình nhỏ muốn đi về trong ngày..." },
      { vehicleType: "7 chỗ", price: "270K", comboDescription: "Xe 7 chỗ ra Phan Thiết phù hợp cho gia đình lớn hoặc nhóm bạn muốn đi một ngày..." },
      { vehicleType: "16 chỗ", price: "800K", comboDescription: "Xe 16 chỗ ra Phan Thiết hợp cho đoàn nhỏ hoặc nhóm bạn đi golf, lướt ván..." },
      { vehicleType: "29 chỗ", price: "1.300K", comboDescription: "Xe 29 chỗ ra Phan Thiết phù hợp cho nhóm bạn hoặc đội nhóm đi golf, lướt ván diều cùng nhau." },
    ],
    pickupPoints: ["Quận 1", "Quận 7", "TP. Thủ Đức", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Trung tâm Phan Thiết", "Mũi Né", "Bàu Trắng", "Khu resort Hàm Tiến"],
    mapEmbedSrc: buildRouteMapEmbedSrc("TP. Hồ Chí Minh", "Phan Thiết"),
    summary: "Ra biển Mũi Né chỉ trong buổi sáng — xe đón đúng giờ, trả tận resort, không lo đổi lịch phút chót.",
    heroNote: "Tuyến biển cho những chuyến đi ngắn ngày",
    departures: ["05:30", "08:00", "11:00", "14:30", "18:00"],
    notes: ["Có điểm dừng ngắm đồi cát nếu đặt trước", "Ưu tiên xe cho nhóm đi golf, lướt ván diều", "Hỗ trợ đặt thêm ghế cho đoàn đông"],
  },
];

export function getRouteBySlug(slug: string): Route | undefined {
  return routes.find((route) => route.slug === slug);
}

export function getRelatedRoutes(currentSlug: string, count = 3): Route[] {
  return routes.filter((route) => route.slug !== currentSlug).slice(0, count);
}
