import type { Service } from "@/types/service";

/**
 * Mock tạm cho CPT `dich_vu` — dùng khi WordPress chưa có bài dịch vụ nào (nhập liệu
 * thật là Ngày 24), theo đúng cơ chế fallback trong lib/api/services.ts (giống
 * fetchRoutes()/fetchVehicles() Ngày 12).
 *
 * `vehicleTypes[].slug` PHẢI khớp đúng slug trong data/vehicle-categories.ts (4-7-cho,
 * 16-29-cho, 45-cho, limousine) để link 2 chiều /dich-vu ↔ /loai-xe không bị 404.
 * `suggestedVehicles[].slug` PHẢI khớp đúng slug thật trong data/vehicles.ts để link
 * sang /doi-xe/[slug] không bị 404.
 */
export const services: Service[] = [
  {
    slug: "xe-cuoi",
    name: "Xe cưới",
    shortDescription: "Đón đưa trọn vẹn ngày vui với chiếc xe chỉn chu, đúng giờ và riêng tư.",
    detailDescription:
      "Dịch vụ xe cưới được chuẩn bị cho những hành trình quan trọng nhất trong ngày thành hôn. Xe được vệ sinh kỹ, tài xế có kinh nghiệm phục vụ nghi lễ và lịch trình được thống nhất trước để gia đình chủ động từng điểm đón, điểm trả. Bạn có thể chọn xe theo phong cách lễ cưới, số lượng người đi cùng và quãng đường di chuyển.",
    icon: "wedding",
    iconLabel: "Xe cưới",
    vehicleTypes: [
      { name: "4–7 chỗ", slug: "4-7-cho", description: "Thanh lịch cho cô dâu chú rể." },
      { name: "Limousine", slug: "limousine", description: "Sang trọng cho đoàn rước dâu." },
    ],
    suggestedVehicles: [
      { name: "Toyota Camry", slug: "premium-sedan", detail: "Êm ái, riêng tư và lịch sự cho ngày trọng đại." },
      { name: "Dcar Limousine", slug: "limousine-22", detail: "Khoang thương gia, chỉn chu cho cả đoàn rước dâu." },
    ],
    notes: [
      "Nên đặt xe trước ngày cưới để giữ đúng mẫu xe mong muốn.",
      "Gửi lịch trình và địa chỉ các điểm đón trước để tài xế chủ động.",
      "Có thể yêu cầu trang trí xe theo concept của buổi lễ.",
    ],
    hotline: "1900 6789",
  },
  {
    slug: "dua-don-san-bay",
    name: "Đưa đón sân bay",
    shortDescription: "Đưa đón đúng giờ, theo dõi lịch bay và hỗ trợ hành lý từ cửa nhà đến sân bay.",
    detailDescription:
      "Dịch vụ đưa đón sân bay giúp bạn loại bỏ những bất tiện của việc tự tìm xe trong khung giờ sớm hoặc khi vừa hạ cánh. Xe được điều phối theo giờ bay, tài xế theo dõi thay đổi lịch trình và đón tại điểm đã thống nhất. Hành trình phù hợp cho khách cá nhân, gia đình, nhóm công tác và khách có nhiều hành lý.",
    icon: "airport",
    iconLabel: "Đưa đón sân bay",
    vehicleTypes: [{ name: "4–7 chỗ", slug: "4-7-cho", description: "Gọn gàng cho 1–7 hành khách, đủ chỗ hành lý." }],
    suggestedVehicles: [
      { name: "Toyota Innova", slug: "family-mpv", detail: "Cốp rộng, phù hợp gia đình nhiều hành lý." },
      { name: "Toyota Camry", slug: "premium-sedan", detail: "Gọn gàng cho khách công tác 1–3 người." },
    ],
    notes: [
      "Cung cấp mã chuyến bay để chúng tôi theo dõi giờ đến chính xác.",
      "Vui lòng báo trước số lượng hành lý cồng kềnh.",
      "Tài xế sẽ liên hệ khi xe đến điểm đón.",
    ],
    hotline: "1900 6789",
  },
  {
    slug: "thue-xe-theo-thang",
    name: "Thuê xe theo tháng",
    shortDescription: "Giải pháp xe dài hạn linh hoạt cho doanh nghiệp, gia đình và chuyên gia công tác.",
    detailDescription:
      "Thuê xe theo tháng là lựa chọn phù hợp khi bạn cần một phương tiện ổn định nhưng chưa muốn đầu tư mua xe. Gói dịch vụ có thể bao gồm xe kèm tài xế, lịch sử dụng cố định hoặc linh hoạt theo nhu cầu. Xe được bảo dưỡng định kỳ, thay thế khi cần và có đầu mối hỗ trợ xuyên suốt thời gian thuê.",
    icon: "monthly",
    iconLabel: "Thuê xe theo tháng",
    vehicleTypes: [
      { name: "4–7 chỗ", slug: "4-7-cho", description: "Phù hợp lịch công tác hằng ngày." },
      { name: "16–29 chỗ", slug: "16-29-cho", description: "Linh hoạt cho đội nhóm và công ty." },
    ],
    suggestedVehicles: [
      { name: "Toyota Camry", slug: "premium-sedan", detail: "Bền bỉ cho nhu cầu sử dụng thường xuyên." },
      { name: "Mercedes Sprinter", slug: "sprinter-16", detail: "Gọn gàng cho đưa đón nhân viên hằng ngày." },
    ],
    notes: [
      "Thời hạn và số ngày sử dụng được thống nhất trong hợp đồng.",
      "Có thể điều chỉnh lịch xe theo lịch làm việc thực tế.",
      "Báo trước nhu cầu đi tỉnh để được tư vấn gói phù hợp.",
    ],
    hotline: "1900 6789",
  },
  {
    slug: "city-tour",
    name: "City tour",
    shortDescription: "Khám phá thành phố theo nhịp riêng với lịch trình linh hoạt và tài xế am hiểu địa phương.",
    detailDescription:
      "City tour mang đến một cách khám phá thành phố thoải mái hơn: bạn tự chọn điểm đến, thời lượng và nhịp di chuyển, còn chúng tôi lo phần đường đi. Tài xế có thể gợi ý các điểm ăn uống, văn hóa và góc check-in phù hợp với nhóm của bạn. Dịch vụ phù hợp cho khách du lịch, gia đình có trẻ nhỏ và nhóm bạn muốn đi trong ngày.",
    icon: "city-tour",
    iconLabel: "City tour",
    vehicleTypes: [
      { name: "16–29 chỗ", slug: "16-29-cho", description: "Phù hợp đoàn đông và nhiều điểm đến." },
      { name: "45 chỗ", slug: "45-cho", description: "Cho đoàn tour lớn cả ngày." },
    ],
    suggestedVehicles: [
      { name: "Mercedes Sprinter", slug: "sprinter-16", detail: "Wifi 4G, thoải mái cho cả ngày di chuyển." },
      { name: "Thaco Universe", slug: "coach-45", detail: "Đủ rộng cho đoàn tour đông người." },
    ],
    notes: [
      "Lịch trình có thể thay đổi trong ngày theo nhu cầu của nhóm.",
      "Nên gom các điểm đến theo khu vực để tối ưu thời gian.",
      "Phí phát sinh ngoài lịch trình sẽ được báo trước.",
    ],
    hotline: "1900 6789",
  },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}
