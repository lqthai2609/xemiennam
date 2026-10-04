import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, CarFront, CheckCircle2, ClipboardList, MapPin, Phone, type LucideIcon } from "lucide-react";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { ZaloIcon } from "@/components/zalo-icon";
import { SITE_CONTACT_PHONE_DISPLAY, SITE_CONTACT_PHONE_TEL, SITE_NAME } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";
import type { Service } from "@/types/service";
import { fallbackImages } from "@/components/service-card";

export type ServiceFeature = { title: string; description: string; icon: LucideIcon };
export const servicePromises: ServiceFeature[] = [
  { title: "Đón tận nơi", description: "Xe đến đúng địa điểm, đúng giờ theo lịch hẹn của bạn.", icon: MapPin },
  { title: "Lịch trình linh hoạt", description: "Dễ dàng điều chỉnh theo nhu cầu thực tế.", icon: CalendarDays },
  { title: "Tư vấn loại xe phù hợp", description: "Đội ngũ tư vấn giúp bạn chọn xe phù hợp với hành trình.", icon: CarFront },
];
export function serviceImage(service: Service, vehicleImages: Record<string, string> = {}) {
  return service.image || (service.slug === "dua-don-nhan-vien-cong-ty" ? vehicleImages["45-cho"] : undefined) || fallbackImages[service.icon];
}
export function ServiceFeatureList({ items, className = "" }: { items: ServiceFeature[]; className?: string }) {
  return <div className={`svc-features ${className}`}>{items.map(({ title, description, icon: Icon }) => <div className="svc-feature" key={title}><span className="svc-icon"><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>;
}
export function ServiceSteps({ business = false }: { business?: boolean }) {
  const steps = business ? [
    { title: "Gửi nhu cầu", description: "Cung cấp số lượng nhân viên, ca làm việc và nhu cầu di chuyển." },
    { title: "Chốt tuyến và loại xe", description: "Tư vấn lộ trình, điểm đón và loại xe phù hợp." },
    { title: "Nhận báo giá và xác nhận", description: "Gửi báo giá chi tiết theo lộ trình và nhu cầu, sau đó xác nhận để triển khai." },
  ] : [
    { title: "Chọn dịch vụ", description: "Chọn loại dịch vụ phù hợp với nhu cầu của bạn." },
    { title: "Gửi lịch trình", description: "Cung cấp điểm đón, điểm đến, thời gian và số người." },
    { title: "Xác nhận chuyến đi", description: "Nhận báo giá và xác nhận, chúng tôi sẽ lo phần còn lại." },
  ];
  const icons = [ClipboardList, CalendarDays, CheckCircle2];
  return <ol className={`svc-steps ${business ? "svc-steps-business" : ""}`}>{steps.map((step, i) => { const Icon = icons[i]; return <li key={step.title}><span className="svc-step-icon">{business ? String(i + 1).padStart(2, "0") : <Icon aria-hidden="true" />}</span><div>{!business && <span className="svc-step-number">{String(i + 1).padStart(2, "0")}</span>}<h3>{step.title}</h3><p>{step.description}</p></div></li>; })}</ol>;
}
export function ServiceContactActions({ quote = false }: { quote?: boolean }) {
  return <div className="svc-actions"><a className="svc-button svc-button-zalo zalo-cta" href={getZaloChatLink()} target="_blank" rel="noopener noreferrer"><ZaloIcon />{quote ? "Nhắn Zalo nhận tư vấn" : "Nhắn Zalo tư vấn"}<ArrowRight aria-hidden="true" /></a>{quote ? <Link className="svc-button svc-button-outline" href="/lien-he"><ClipboardList aria-hidden="true" />Gửi yêu cầu báo giá</Link> : <a className="svc-button svc-button-outline" href={`tel:${SITE_CONTACT_PHONE_TEL}`}><Phone aria-hidden="true" />Gọi {SITE_CONTACT_PHONE_DISPLAY}</a>}</div>;
}
export function ServiceContactBanner({ business = false, image = "/images/home-coastal-fleet.webp" }: { business?: boolean; image?: string }) {
  return <section className="svc-contact-banner"><Image src={image} alt="" fill sizes="100vw" /><div className="svc-container"><div>{business && <p className="svc-eyebrow">ĐỒNG HÀNH CÙNG DOANH NGHIỆP</p>}<h2>{business ? "Trao đổi lịch xe cho doanh nghiệp của bạn" : <>Cần một chuyến xe<br />theo lịch riêng?</>}</h2><p>{business ? `Đội ngũ ${SITE_NAME} sẵn sàng tư vấn phương án di chuyển phù hợp với quy mô và nhu cầu thực tế.` : "Đội ngũ tư vấn luôn sẵn sàng hỗ trợ bạn."}</p><ServiceContactActions /></div></div></section>;
}
export function ServiceDesignFooter({ services = [] }: { services?: Service[] }) {
  return <SiteFooter tagline={<>Xe riêng có tài xế, đồng hành cùng bạn<br />trên mọi hành trình.</>} phone={SITE_CONTACT_PHONE_DISPLAY} phoneHref={`tel:${SITE_CONTACT_PHONE_TEL}`} linkGroups={[
    { title: "DỊCH VỤ", links: services.length ? services.map(s => ({ label: s.name, href: `/dich-vu/${s.slug}` })) : [{ label: "Tất cả dịch vụ", href: "/dich-vu" }] },
    { title: "THÔNG TIN", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Điểm đến", href: "/diem-den" }, { label: "Loại xe", href: "/loai-xe" }, { label: "Bảng giá", href: "/bang-gia" }, { label: "Blog", href: "/blog" }, { label: "Liên hệ", href: "/lien-he" }] },
  ]} socialLinks={defaultSocialLinks} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Xe riêng cho hành trình của bạn." />;
}
