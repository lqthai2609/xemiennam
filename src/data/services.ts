import type { Service } from "@/types/service";
import { SITE_HOTLINE } from "@/lib/site-config";

/** Mock cho CPT `dich_vu`, chỉ dùng theo policy môi trường. Slug phải khớp 6 category hiện tại. */
export const services: Service[] = [
  {
    slug: "xe-cuoi",
    name: "Xe cưới",
    shortDescription: "Đón đưa trọn vẹn ngày vui với chiếc xe chỉn chu, đúng giờ và riêng tư.",
    detailDescription:
      "Dịch vụ xe cưới được chuẩn bị cho những hành trình quan trọng nhất trong ngày thành hôn. Xe được vệ sinh kỹ, tài xế có kinh nghiệm phục vụ nghi lễ và lịch trình được thống nhất trước để gia đình chủ động từng điểm đón, từng điểm trả. Bạn có thể chọn xe theo phong cách lễ cưới, số lượng người đi cùng và quãng đường di chuyển.",
    icon: "wedding",
    iconLabel: "Xe cưới",
    image: "/images/services/wedding.png",
    vehicleTypes: [
      { name: "4 chỗ", slug: "4-cho", description: "Thanh lịch cho cô dâu chú rể." },
      { name: "7 chỗ", slug: "7-cho", description: "Linh hoạt cho gia đình và người thân." },
      { name: "Limousine", slug: "limousine", description: "Sang trọng cho đoàn rước dâu." },
    ],
    suggestedVehicles: [
      { name: "Toyota Camry", slug: "4-cho", detail: "Êm ái, riêng tư và lịch sự cho ngày trọng đại." },
      { name: "Dcar Limousine", slug: "limousine", detail: "Khoang thương gia, chỉn chu cho cả đoàn rước dâu." },
    ],
    notes: [
      "Nên đặt xe trước ngày cưới để giữ đúng mẫu xe mong muốn.",
      "Gửi lịch trình và địa chỉ các điểm đón trước để tài xế chủ động.",
      "Có thể yêu cầu trang trí xe theo concept của buổi lễ.",
    ],
    hotline: SITE_HOTLINE,
  },
  {
    slug: "dua-don-san-bay",
    name: "Đưa đón sân bay",
    shortDescription: "Đưa đón đúng giờ, theo dõi lịch bay và hỗ trợ hành lý từ cửa nhà đến sân bay.",
    detailDescription:
      "Dịch vụ đưa đón sân bay giúp bạn loại bỏ những bất tiện của việc tự tìm xe trong khung giờ sớm hoặc khi vừa hạ cánh. Xe được điều phối theo giờ bay, tài xế theo dõi thay đổi lịch trình và đón tại điểm đã thống nhất. Hành trình phù hợp cho khách cá nhân, gia đình, nhóm công tác và khách có nhiều hành lý.",
    icon: "airport",
    iconLabel: "Đưa đón sân bay",
    image: "/images/services/airport.png",
    vehicleTypes: [
      { name: "4 chỗ", slug: "4-cho", description: "Gọn gàng cho khách cá nhân hoặc công tác." },
      { name: "7 chỗ", slug: "7-cho", description: "Phù hợp gia đình và nhóm có nhiều hành lý." },
    ],
    suggestedVehicles: [
      { name: "Toyota Innova", slug: "7-cho", detail: "Cốp rộng, phù hợp gia đình nhiều hành lý." },
      { name: "Toyota Camry", slug: "4-cho", detail: "Gọn gàng cho khách công tác 1–3 người." },
    ],
    notes: [
      "Cung cấp mã chuyến bay để chúng tôi theo dõi giờ đến chính xác.",
      "Vui lòng báo trước số lượng hành lý cồng kềnh.",
      "Tài xế sẽ liên hệ khi xe đến điểm đón.",
    ],
    hotline: SITE_HOTLINE,
  },
  {
    slug: "thue-xe-theo-thang",
    name: "Thuê xe theo tháng",
    shortDescription: "Giải pháp xe dài hạn linh hoạt cho doanh nghiệp, gia đình và chuyên gia công tác.",
    detailDescription:
      "Thuê xe theo tháng là lựa chọn phù hợp khi bạn cần một phương tiện ổn định nhưng chưa muốn đầu tư mua xe. Gói dịch vụ có thể bao gồm xe kèm tài xế, lịch sử dụng cố định hoặc linh hoạt theo nhu cầu. Xe được bảo dưỡng định kỳ, thay thế khi cần và có đầu mối hỗ trợ xuyên suốt thời gian thuê.",
    icon: "monthly",
    iconLabel: "Thuê xe theo tháng",
    image: "/images/services/monthly.png",
    vehicleTypes: [
      { name: "4 chỗ", slug: "4-cho", description: "Phù hợp lịch công tác hằng ngày." },
      { name: "7 chỗ", slug: "7-cho", description: "Linh hoạt cho gia đình và chuyên gia." },
      { name: "16 chỗ", slug: "16-cho", description: "Phù hợp đưa đón đội nhóm." },
      { name: "29 chỗ", slug: "29-cho", description: "Phù hợp doanh nghiệp và đoàn vừa." },
    ],
    suggestedVehicles: [
      { name: "Toyota Camry", slug: "4-cho", detail: "Bền bỉ cho nhu cầu sử dụng thường xuyên." },
      { name: "Mercedes Sprinter", slug: "16-cho", detail: "Gọn gàng cho đưa đón nhân viên hằng ngày." },
    ],
    notes: [
      "Thời hạn và số ngày sử dụng được thống nhất trong hợp đồng.",
      "Có thể điều chỉnh lịch xe theo lịch làm việc thực tế.",
      "Báo trước nhu cầu đi tỉnh để được tư vấn gói phù hợp.",
    ],
    hotline: SITE_HOTLINE,
  },
  {
    slug: "city-tour",
    name: "City tour",
    shortDescription: "Khám phá thành phố theo nhịp riêng với lịch trình linh hoạt và tài xế am hiểu địa phương.",
    detailDescription:
      "City tour mang đến một cách khám phá thành phố thoải mái hơn: bạn tự chọn điểm đến, thời lượng và nhịp di chuyển, còn chúng tôi lo phần đường đi. Tài xế có thể gợi ý các điểm ăn uống, văn hóa và góc check-in phù hợp với nhóm của bạn. Dịch vụ phù hợp cho khách du lịch, gia đình có trẻ nhỏ và nhóm bạn muốn đi trong ngày.",
    icon: "city-tour",
    iconLabel: "City tour",
    image: "/images/services/city-tour.png",
    vehicleTypes: [
      { name: "16 chỗ", slug: "16-cho", description: "Phù hợp đoàn nhỏ và nhiều điểm đến." },
      { name: "29 chỗ", slug: "29-cho", description: "Phù hợp đoàn vừa đi cùng nhau." },
      { name: "45 chỗ", slug: "45-cho", description: "Cho đoàn tour lớn cả ngày." },
    ],
    suggestedVehicles: [
      { name: "Mercedes Sprinter", slug: "16-cho", detail: "Thoải mái cho cả ngày di chuyển." },
      { name: "Thaco Universe", slug: "45-cho", detail: "Đủ rộng cho đoàn tour đông người." },
    ],
    notes: [
      "Lịch trình có thể thay đổi trong ngày theo nhu cầu của nhóm.",
      "Nên gom các điểm đến theo khu vực để tối ưu thời gian.",
      "Phí phát sinh ngoài lịch trình sẽ được báo trước.",
    ],
    hotline: SITE_HOTLINE,
  },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}
