import type { Route } from "@/types/route";

export interface RouteDetail extends Route {
  slug: string;
  summary: string;
  heroNote: string;
  pickup: string[];
  dropoff: string[];
  departures: string[];
  mapUrl: string;
  notes: string[];
}

export const routeDetails: RouteDetail[] = [
  {
    id: "hcm-vung-tau",
    slug: "tp-ho-chi-minh-vung-tau",
    from: "TP. Hồ Chí Minh",
    to: "Vũng Tàu",
    time: "2h 15m",
    distance: "125 km",
    price: "140K",
    vehicleTypes: ["4–7 chỗ", "16–29 chỗ", "45 chỗ", "Limousine"],
    region: "Vũng Tàu",
    seatCount: ["4–7 chỗ", "16–29 chỗ", "45 chỗ"],
    summary: "Từ nhịp sống thành phố đến biển xanh cuối tuần — đón tận nơi, trả đúng điểm.",
    heroNote: "Tuyến biển được yêu thích nhất miền Nam",
    pickup: ["Quận 1", "Quận 3", "TP. Thủ Đức", "Sân bay Tân Sơn Nhất"],
    dropoff: ["Bãi Sau", "Bãi Trước", "Trung tâm Vũng Tàu", "Long Hải"],
    departures: ["06:00", "08:00", "10:00", "13:30", "16:00"],
    mapUrl: "https://www.openstreetmap.org/export/embed.html?bbox=106.55%2C10.55%2C107.25%2C10.65&layer=mapnik",
    notes: ["Đón tận nhà trong khu vực nội thành", "Không phụ thu cuối tuần", "Có xe riêng cho gia đình và nhóm nhỏ"],
  },
  {
    id: "hcm-can-tho",
    slug: "tp-ho-chi-minh-can-tho",
    from: "TP. Hồ Chí Minh",
    to: "Cần Thơ",
    time: "3h 30m",
    distance: "170 km",
    price: "180K",
    vehicleTypes: ["4–7 chỗ", "16–29 chỗ", "45 chỗ"],
    region: "Cần Thơ",
    seatCount: ["4–7 chỗ", "16–29 chỗ", "45 chỗ"],
    summary: "Về miền Tây nhẹ nhàng, đúng giờ với những chuyến xe thoải mái mỗi ngày.",
    heroNote: "Kết nối thành phố với miền sông nước",
    pickup: ["Quận 1", "Quận 5", "Bình Thạnh", "Sân bay Tân Sơn Nhất"],
    dropoff: ["Ninh Kiều", "Cái Răng", "Ô Môn", "Bến xe Cần Thơ"],
    departures: ["05:30", "07:30", "09:30", "12:30", "15:30"],
    mapUrl: "https://www.openstreetmap.org/export/embed.html?bbox=105.55%2C10.0%2C106.95%2C10.9&layer=mapnik",
    notes: ["Có khoang hành lý rộng", "Hỗ trợ gửi hàng nhỏ đi cùng chuyến", "Đặt trước để chọn điểm đón thuận tiện"],
  },
  {
    id: "hcm-da-lat",
    slug: "tp-ho-chi-minh-da-lat",
    from: "TP. Hồ Chí Minh",
    to: "Đà Lạt",
    time: "6h 30m",
    distance: "300 km",
    price: "290K",
    vehicleTypes: ["4–7 chỗ", "Limousine"],
    region: "Đà Lạt",
    seatCount: ["4–7 chỗ"],
    summary: "Lên cao nguyên trong khoang xe êm ái, để đoạn đường dài trở thành một phần của chuyến đi.",
    heroNote: "Hành trình cao nguyên cho những ngày cần nghỉ ngơi",
    pickup: ["Quận 1", "Quận 3", "Quận 10", "Sân bay Tân Sơn Nhất"],
    dropoff: ["Trung tâm Đà Lạt", "Hồ Xuân Hương", "Bến xe liên tỉnh", "Đức Trọng"],
    departures: ["06:30", "08:30", "11:00", "20:30", "22:00"],
    mapUrl: "https://www.openstreetmap.org/export/embed.html?bbox=107.75%2C10.55%2C108.55%2C11.1&layer=mapnik",
    notes: ["Limousine ghế massage cho tuyến dài", "Có chuyến đêm tiện nghỉ ngơi", "Tài xế quen cung đường đèo"],
  },
];

export function getRouteDetail(slug: string) {
  return routeDetails.find((route) => route.slug === slug);
}
