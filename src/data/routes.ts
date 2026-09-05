import { Route } from "@/types/route";

/**
 * Dữ liệu mock DUY NHẤT cho toàn bộ tuyến — dùng ở trang chủ, /tuyen-duong,
 * và /tuyen-duong/[slug]. Khi nối WP REST API thật (Ngày 12), thay import
 * này bằng fetchRoutes()/getPricingTable() nhưng giữ nguyên shape Route.
 */
export const routes: Route[] = [
  {
    id: "hcm-vung-tau",
    slug: "hcm-vung-tau",
    from: "TP. Hồ Chí Minh",
    to: "Vũng Tàu",
    region: "Vũng Tàu",
    time: "2h 15m",
    distance: "125 km",
    price: "140K",
    vehicleTypes: ["4–7 chỗ", "16–29 chỗ", "45 chỗ", "Limousine"],
    seatCount: ["4–7 chỗ", "16–29 chỗ", "45 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4–7 chỗ", price: "140K" },
      { vehicleType: "16–29 chỗ", price: "850K" },
      { vehicleType: "45 chỗ", price: "1.450K" },
      { vehicleType: "Limousine", price: "320K" },
    ],
    pickupPoints: ["Quận 1", "Quận 3", "TP. Thủ Đức", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Bãi Sau", "Bãi Trước", "Trung tâm Vũng Tàu", "Long Hải"],
    mapEmbedSrc: "https://maps.google.com/maps?q=V%C5%A9ng+T%C3%A0u%2C+Vi%E1%BB%87t+Nam&output=embed",
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
    time: "3h 30m",
    distance: "170 km",
    price: "180K",
    vehicleTypes: ["4–7 chỗ", "16–29 chỗ", "45 chỗ"],
    seatCount: ["4–7 chỗ", "16–29 chỗ", "45 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4–7 chỗ", price: "180K" },
      { vehicleType: "16–29 chỗ", price: "1.100K" },
      { vehicleType: "45 chỗ", price: "1.900K" },
    ],
    pickupPoints: ["Quận 1", "Quận 5", "Bình Thạnh", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Ninh Kiều", "Cái Răng", "Ô Môn", "Bến xe Cần Thơ"],
    mapEmbedSrc: "https://maps.google.com/maps?q=C%E1%BA%A7n+Th%C6%A1%2C+Vi%E1%BB%87t+Nam&output=embed",
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
    time: "6h 30m",
    distance: "300 km",
    price: "290K",
    vehicleTypes: ["4–7 chỗ", "Limousine"],
    seatCount: ["4–7 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4–7 chỗ", price: "290K" },
      { vehicleType: "Limousine", price: "450K" },
    ],
    pickupPoints: ["Quận 1", "Quận 3", "Quận 10", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Trung tâm Đà Lạt", "Hồ Xuân Hương", "Bến xe liên tỉnh", "Đức Trọng"],
    mapEmbedSrc: "https://maps.google.com/maps?q=%C4%90%C3%A0+L%E1%BA%A1t%2C+Vi%E1%BB%87t+Nam&output=embed",
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
    time: "3h 45m",
    distance: "200 km",
    price: "220K",
    vehicleTypes: ["4–7 chỗ", "16–29 chỗ"],
    seatCount: ["4–7 chỗ", "16–29 chỗ"],
    pricingByVehicle: [
      { vehicleType: "4–7 chỗ", price: "220K" },
      { vehicleType: "16–29 chỗ", price: "1.300K" },
    ],
    pickupPoints: ["Quận 1", "Quận 7", "TP. Thủ Đức", "Sân bay Tân Sơn Nhất"],
    dropoffPoints: ["Trung tâm Phan Thiết", "Mũi Né", "Bàu Trắng", "Khu resort Hàm Tiến"],
    mapEmbedSrc: "https://maps.google.com/maps?q=Phan+Thi%E1%BA%BFt%2C+Vi%E1%BB%87t+Nam&output=embed",
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
