import type { Service } from "@/types/service";

export const services: Service[] = [
  {
    slug: "xe-cuoi",
    name: "Xe cưới",
    shortDescription: "Đón đưa trọn vẹn ngày vui với chiếc xe chỉn chu, đúng giờ và riêng tư.",
    detailDescription: "Dịch vụ xe cưới được chuẩn bị cho những hành trình quan trọng nhất trong ngày thành hôn. Xe được vệ sinh kỹ, tài xế có kinh nghiệm phục vụ nghi lễ và lịch trình được thống nhất trước để gia đình chủ động từng điểm đón, điểm trả. Bạn có thể chọn xe theo phong cách lễ cưới, số lượng người đi cùng và quãng đường di chuyển.",
    icon: "wedding",
    iconLabel: "Xe cưới",
    vehicleTypes: [
      { name: "Sedan hạng sang", slug: "sedan-hang-sang", description: "Thanh lịch cho cô dâu chú rể." },
      { name: "SUV cao cấp", slug: "suv-cao-cap", description: "Rộng rãi cho gia đình và ekip." },
    ],
    suggestedVehicles: [
      { name: "Mercedes-Benz E-Class", slug: "mercedes-benz-e-class", detail: "Không gian sang trọng, vận hành êm." },
      { name: "Toyota Camry", slug: "toyota-camry", detail: "Thanh lịch và thoải mái cho ngày dài." },
    ],
    notes: ["Nên đặt xe trước ngày cưới để giữ đúng mẫu xe mong muốn.", "Gửi lịch trình và địa chỉ các điểm đón trước để tài xế chủ động.", "Có thể yêu cầu trang trí xe theo concept của buổi lễ."],
    hotline: "1900 6789",
  },
  {
    slug: "dua-don-san-bay",
    name: "Đưa đón sân bay",
    shortDescription: "Đưa đón đúng giờ, theo dõi lịch bay và hỗ trợ hành lý từ cửa nhà đến sân bay.",
    detailDescription: "Dịch vụ đưa đón sân bay giúp bạn loại bỏ những bất tiện của việc tự tìm xe trong khung giờ sớm hoặc khi vừa hạ cánh. Xe được điều phối theo giờ bay, tài xế theo dõi thay đổi lịch trình và đón tại điểm đã thống nhất. Hành trình phù hợp cho khách cá nhân, gia đình, nhóm công tác và khách có nhiều hành lý.",
    icon: "airport",
    iconLabel: "Đưa đón sân bay",
    vehicleTypes: [
      { name: "Sedan tiêu chuẩn", slug: "sedan-tieu-chuan", description: "Gọn gàng cho 1–3 hành khách." },
      { name: "MPV gia đình", slug: "mpv-gia-dinh", description: "Thoải mái với nhiều hành lý." },
    ],
    suggestedVehicles: [],
    notes: ["Cung cấp mã chuyến bay để chúng tôi theo dõi giờ đến chính xác.", "Vui lòng báo trước số lượng hành lý cồng kềnh.", "Tài xế sẽ liên hệ khi xe đến điểm đón."],
    hotline: "1900 6789",
  },
  {
    slug: "thue-xe-theo-thang",
    name: "Thuê xe theo tháng",
    shortDescription: "Giải pháp xe dài hạn linh hoạt cho doanh nghiệp, gia đình và chuyên gia công tác.",
    detailDescription: "Thuê xe theo tháng là lựa chọn phù hợp khi bạn cần một phương tiện ổn định nhưng chưa muốn đầu tư mua xe. Gói dịch vụ có thể bao gồm xe kèm tài xế, lịch sử dụng cố định hoặc linh hoạt theo nhu cầu. Xe được bảo dưỡng định kỳ, thay thế khi cần và có đầu mối hỗ trợ xuyên suốt thời gian thuê.",
    icon: "monthly",
    iconLabel: "Thuê xe theo tháng",
    vehicleTypes: [
      { name: "Sedan doanh nhân", slug: "sedan-doanh-nhan", description: "Phù hợp lịch công tác hằng ngày." },
      { name: "SUV 7 chỗ", slug: "suv-7-cho", description: "Linh hoạt cho đội nhóm và gia đình." },
    ],
    suggestedVehicles: [
      { name: "Honda CR-V", slug: "honda-cr-v", detail: "Bền bỉ cho nhu cầu sử dụng thường xuyên." },
    ],
    notes: ["Thời hạn và số ngày sử dụng được thống nhất trong hợp đồng.", "Có thể điều chỉnh lịch xe theo lịch làm việc thực tế.", "Báo trước nhu cầu đi tỉnh để được tư vấn gói phù hợp."],
    hotline: "1900 6789",
  },
  {
    slug: "city-tour",
    name: "City tour",
    shortDescription: "Khám phá thành phố theo nhịp riêng với lịch trình linh hoạt và tài xế am hiểu địa phương.",
    detailDescription: "City tour mang đến một cách khám phá thành phố thoải mái hơn: bạn tự chọn điểm đến, thời lượng và nhịp di chuyển, còn chúng tôi lo phần đường đi. Tài xế có thể gợi ý các điểm ăn uống, văn hóa và góc check-in phù hợp với nhóm của bạn. Dịch vụ phù hợp cho khách du lịch, gia đình có trẻ nhỏ và nhóm bạn muốn đi trong ngày.",
    icon: "city-tour",
    iconLabel: "City tour",
    vehicleTypes: [
      { name: "MPV 7 chỗ", slug: "mpv-7-cho", description: "Thoải mái cho nhóm nhỏ." },
      { name: "Minivan 16 chỗ", slug: "minivan-16-cho", description: "Phù hợp đoàn đông và nhiều điểm đến." },
    ],
    suggestedVehicles: [
      { name: "Kia Carnival", slug: "kia-carnival", detail: "Nội thất rộng, phù hợp chuyến đi cả ngày." },
      { name: "Ford Transit", slug: "ford-transit", detail: "Không gian linh hoạt cho nhóm đông." },
    ],
    notes: ["Lịch trình có thể thay đổi trong ngày theo nhu cầu của nhóm.", "Nên gom các điểm đến theo khu vực để tối ưu thời gian.", "Phí phát sinh ngoài lịch trình sẽ được báo trước."],
    hotline: "1900 6789",
  },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}
