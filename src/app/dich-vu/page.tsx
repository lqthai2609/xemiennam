import type { Metadata } from "next";
import { ServicesPage } from "@/components/services-page";
import { services } from "@/data/services";

export const metadata: Metadata = { title: "Dịch vụ theo nhu cầu | Xe Miền Nam", description: "Chọn dịch vụ xe phù hợp với ngày vui, lịch bay, công việc và hành trình khám phá của bạn." };

export default function Page() {
  return <ServicesPage services={services} />;
}
