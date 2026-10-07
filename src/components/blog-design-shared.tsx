import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CarFront, Map, MapPin, Phone } from "lucide-react";
import { ZaloIcon } from "@/components/zalo-icon";
import { SITE_CONTACT_PHONE_DISPLAY, SITE_CONTACT_PHONE_TEL } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";

const discoveryLinks = [
  { title: "Xem tuyến đường", description: "Gợi ý lộ trình và thông tin chuyến đi.", href: "/tuyen-duong", image: "/images/destinations/ba-ria-vung-tau.webp", icon: Map },
  { title: "Chọn loại xe", description: "Tìm loại xe phù hợp với nhu cầu của bạn.", href: "/loai-xe", image: "/images/home-vehicle-trio.webp", icon: CarFront },
  { title: "Khám phá điểm đến", description: "Tìm hiểu điểm đến cho hành trình sắp tới.", href: "/diem-den", image: "/images/destinations/phan-thiet.webp", icon: MapPin },
];

export function BlogDiscovery() {
  return <section className="journal-discovery"><h2 className="journal-heading">Tìm theo nhu cầu</h2><p>Khám phá thêm những thông tin hữu ích cho hành trình của bạn.</p><div className="journal-discovery-grid">{discoveryLinks.map(({ title, description, href, image, icon: Icon }) => <Link className="journal-discovery-card" href={href} key={href}><div className="journal-discovery-image"><Image src={image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" /></div><div className="journal-discovery-copy"><span className="journal-round-icon"><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div><ArrowRight size={18} aria-hidden="true" /></div></Link>)}</div></section>;
}

export function BlogContactBanner({ detail = false }: { detail?: boolean }) {
  return <section className="journal-contact"><div><h2>{detail ? "Chưa chắc nên chọn xe nào?" : "Cần tư vấn chuyến đi?"}</h2><p>Liên hệ để được tư vấn lộ trình và loại xe phù hợp với nhu cầu của bạn.</p></div><div className="journal-contact-actions"><a className="journal-button journal-zalo zalo-cta" href={getZaloChatLink()} target="_blank" rel="noopener noreferrer"><ZaloIcon />Nhắn Zalo tư vấn<ArrowRight size={18} aria-hidden="true" /></a><a className="journal-button journal-outline" href={`tel:${SITE_CONTACT_PHONE_TEL}`}><Phone size={18} aria-hidden="true" />Gọi {SITE_CONTACT_PHONE_DISPLAY}</a></div></section>;
}
