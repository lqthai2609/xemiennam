"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowRightLeft, BriefcaseBusiness, CalendarDays, CarFront, Check, ChevronDown, ClipboardCheck, Flame, Luggage, Mail, MapPin, MessageCircle, Phone, Search, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { canonicalLocationKey } from "@/lib/location-search";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";
import { routeComboHref, type Route } from "@/types/route";
import type { VehicleCategory } from "@/types/vehicle-category";
import type { BlogPost } from "@/types/blog";
import type { VehicleCategoryRoutePrice } from "@/lib/vehicle-category-pricing";

type RouteLink = { label: string; href: string };
type ServiceLink = { title: string; description: string; href: string };

const capacity: Record<string, string> = { "4-cho": "1–3 hành khách", "7-cho": "3–6 hành khách", "16-cho": "7–14 hành khách", "29-cho": "Đoàn vừa", "45-cho": "Đoàn lớn", limousine: "Không gian cao cấp" };
const needs = [
  { title: "Cặp đôi", description: "Di chuyển thoải mái, riêng tư cho 2 người.", image: "/images/destinations/ba-ria-vung-tau.webp", icon: UsersRound },
  { title: "Gia đình nhỏ", description: "Phù hợp cho gia đình 2–3 hành khách.", image: "/images/services/city-tour.png", icon: Luggage },
  { title: "Đi công tác", description: "Chủ động thời gian, di chuyển nhanh chóng, thoải mái.", image: "/images/services/airport.png", icon: BriefcaseBusiness },
];

export function VehicleTypeDetailRedesign({ category, routePrices, routes, airportRoutes, services, otherCategories }: {
  category: VehicleCategory;
  routePrices: VehicleCategoryRoutePrice[];
  routes: Route[];
  relatedRoutes: RouteLink[];
  airportRoutes: RouteLink[];
  services: ServiceLink[];
  galleryImages: string[];
  relatedPosts: BlogPost[];
  otherCategories: VehicleCategory[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trip, setTrip] = useState("one_way");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const zalo = getZaloChatLink();
  const title = category.slug === "limousine" ? "Limousine cho hành trình riêng" : `Xe ${category.type} cho hành trình riêng`;
  const locations = useMemo(() => Array.from(new Map(routes.flatMap((route) => [route.from, route.to]).filter((name) => !/^City Tour/i.test(name)).map((name) => [canonicalLocationKey(name), getPublicLocationLabel(name)])).values()).sort((a, b) => a.localeCompare(b, "vi")), [routes]);
  const routeCards = useMemo(() => {
    const rows = routePrices.map((row) => ({ ...row, routeData: routes.find((route) => routeComboHref(route, category.slug) === row.href) })).filter((row) => row.routeData);
    return rows.sort((a, b) => {
      const rank = (route?: Route) => route ? (/vung-tau/i.test(route.slug) ? 0 : /long-hai/i.test(route.slug) ? 1 : /phu-my/i.test(route.slug) ? 2 : /san-bay/i.test(route.slug) ? 3 : 4) : 5;
      return rank(a.routeData) - rank(b.routeData);
    });
  }, [routePrices, routes, category.slug]);
  const matchingRoutes = routeCards.filter((row) => row.route.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  const displayed = query.trim() ? matchingRoutes : matchingRoutes.slice(0, 4);
  const seatOrder = ["4-cho", "7-cho", "16-cho", "29-cho", "45-cho", "limousine"];
  const largerCategories = otherCategories.filter((other) => seatOrder.indexOf(other.slug) > seatOrder.indexOf(category.slug)).slice(0, 2);
  const suggestions = largerCategories.length ? largerCategories : otherCategories.slice(-2);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to) { setError("Vui lòng chọn điểm đón và điểm đến."); return; }
    if (canonicalLocationKey(from) === canonicalLocationKey(to)) { setError("Điểm đón và điểm đến phải khác nhau."); return; }
    setError("");
    const direct = routes.find((route) => canonicalLocationKey(route.from) === canonicalLocationKey(from) && canonicalLocationKey(route.to) === canonicalLocationKey(to) && route.pricingV2?.outbound.enabled);
    const reverse = routes.find((route) => canonicalLocationKey(route.to) === canonicalLocationKey(from) && canonicalLocationKey(route.from) === canonicalLocationKey(to) && route.pricingV2?.inbound.enabled);
    const route = direct || reverse;
    if (route) {
      const direction = direct ? "outbound" : "inbound";
      const available = route.pricingV2?.[direction].packages.some((row) => row.vehicleType === category.type && row.mode !== "disabled");
      if (available) { router.push(`${routeComboHref(route, category.slug)}?direction=${direction}&trip_type=${trip}#pricing`); return; }
    }
    router.push(`/tuyen-duong?${new URLSearchParams({ from, to }).toString()}#route-catalog`);
  }

  return <main className="site-shell home-redesign vehicle-detail">
    <SiteHeader menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Blog", "Liên hệ"].includes(item.label))} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zalo} homeDesign />
    <section className="vehicle-detail-hero" aria-labelledby="vehicle-detail-title"><div className="vehicle-detail-hero-photo" role="img" aria-label="Xe riêng trên cung đường ven biển" /><div className="vehicle-detail-width vehicle-detail-hero-inner"><div className="vehicle-detail-hero-copy"><nav aria-label="Đường dẫn"><Link href="/loai-xe">Loại xe</Link><span>/</span><span>Xe {category.type}</span></nav><p className="home-eyebrow">XE RIÊNG CÓ TÀI XẾ</p><h1 id="vehicle-detail-title">{title}</h1><p>Gọn gàng cho {capacity[category.slug]?.toLowerCase() || "hành trình của bạn"}, phù hợp đi công tác, đi sân bay và du lịch.</p><div className="vehicle-detail-pills"><span><UsersRound size={19} /> {capacity[category.slug]}</span><span><CarFront size={19} /> Xe riêng có tài xế</span></div><div className="vehicle-detail-hero-actions"><a className="home-button home-button-primary" href={zalo} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} /> Nhắn Zalo tư vấn xe <ArrowRight size={16} /></a><a className="home-button home-button-outline" href="#vehicle-detail-routes">Xem tuyến và giá <ArrowRight size={16} /></a></div></div></div></section>
    <div className="vehicle-detail-width vehicle-detail-content">
      <section className="vehicle-detail-finder" aria-labelledby="vehicle-detail-finder-title"><div className="vehicle-detail-finder-heading"><h2 id="vehicle-detail-finder-title"><span><Search size={24} /></span>Bạn muốn đi đâu bằng xe {category.type}?</h2><p>Giá chưa có sẵn sẽ được báo theo lịch thực tế.</p></div><form onSubmit={submit}><label><MapPin size={22} /><span><strong>Điểm đón</strong><select value={from} onChange={(event) => { setFrom(event.target.value); setError(""); }} required><option value="">Chọn điểm đón</option>{locations.map((name) => <option key={name} value={name}>{name}</option>)}</select></span><ChevronDown size={16} /></label><button type="button" className="vehicle-detail-swap" aria-label="Đổi chiều điểm đón và điểm đến" onClick={() => { setFrom(to); setTo(from); }}><ArrowRightLeft size={21} /></button><label><MapPin size={22} /><span><strong>Điểm đến</strong><select value={to} onChange={(event) => { setTo(event.target.value); setError(""); }} required><option value="">Chọn điểm đến</option>{locations.map((name) => <option key={name} value={name}>{name}</option>)}</select></span><ChevronDown size={16} /></label><label><CarFront size={22} /><span><strong>Loại chuyến</strong><select value={trip} onChange={(event) => setTrip(event.target.value)}><option value="one_way">Một chiều</option><option value="round_trip">Khứ hồi</option></select></span><ChevronDown size={16} /></label><button type="submit" className="home-button home-button-primary">Xem giá chuyến xe <ArrowRight size={16} /></button></form>{error && <p className="vehicle-detail-error" role="alert">{error}</p>}</section>

      <section className="vehicle-detail-needs"><header className="vehicle-detail-heading"><h2>Xe {category.type} phù hợp khi nào?</h2><p>Lựa chọn lý tưởng cho nhiều nhu cầu di chuyển hằng ngày.</p></header><div className="vehicle-detail-needs-grid">{needs.map((need) => <article key={need.title}><div className="vehicle-detail-need-image"><Image src={need.image} alt="" fill sizes="(max-width: 700px) 46vw, 33vw" /></div><div><h3><need.icon size={19} /> {need.title}</h3><p>{need.description}</p></div></article>)}</div><div className="vehicle-detail-dots" aria-hidden="true"><i /><i /><i /></div></section>

      <section className="vehicle-detail-space"><div className="vehicle-detail-space-photos"><div className="vehicle-detail-car-photo"><Image src="/images/home-coastal-fleet.webp" alt={`Xe ${category.type} trên đường ven biển`} fill sizes="(max-width: 700px) 60vw, 33vw" /></div><div className="vehicle-detail-car-photo"><Image src="/images/home-vehicle-trio.webp" alt="Các lựa chọn xe riêng" fill sizes="(max-width: 700px) 60vw, 33vw" /></div></div><div className="vehicle-detail-space-copy"><h2>Không gian vừa đủ,<br />chuyến đi chủ động</h2><ul><li><Check />Xe riêng, chỉ phục vụ đoàn của bạn</li><li><Check />Có tài xế giàu kinh nghiệm, thân thiện</li><li><Check />Điểm đón và trả được xác nhận khi đặt</li></ul><p><Luggage size={21} />Không gian hành lý tùy dòng xe, vui lòng xác nhận khi tư vấn.</p></div></section>

      <section className="vehicle-detail-routes" id="vehicle-detail-routes"><div className="vehicle-detail-route-heading"><div><h2><Flame size={29} />Tuyến phổ biến bằng xe {category.type}</h2><p>Các tuyến được nhiều khách hàng lựa chọn.</p></div><label><span className="sr-only">Tìm tuyến trong danh sách phổ biến</span><input type="search" placeholder="Tìm tuyến khác (ví dụ: Sài Gòn, Vũng Tàu...)" value={query} onChange={(event) => setQuery(event.target.value)} /><Search size={20} /></label><Link href="/tuyen-duong">Xem tất cả tuyến <ArrowRight size={15} /></Link></div><div className="vehicle-detail-route-grid">{displayed.map((row) => <article key={row.href} className="vehicle-detail-route-card"><Link href={row.href} className="vehicle-detail-route-image" aria-label={`Xem tuyến ${row.route}`}><Image src={row.routeData?.featuredImage || "/images/destinations/ba-ria-vung-tau.webp"} alt="" fill sizes="(max-width: 700px) 30vw, 25vw" /></Link><div><h3><Link href={row.href}>{row.route}</Link></h3><p><UsersRound size={13} /> {row.routeData?.distance || "Lộ trình linh hoạt"}<span>◉</span> {row.routeData?.time || "Theo lịch thực tế"}</p><small>{row.price === "Liên hệ báo giá" ? "Báo giá" : "Giá chỉ"}</small><strong>{row.price}</strong><em>{row.note.split(" · ")[0]} / chuyến</em></div><Link href={row.href} className="vehicle-detail-route-link">Xem tuyến <ArrowRight size={15} /></Link></article>)}</div>{displayed.length === 0 && <p className="vehicle-detail-empty">Không có tuyến trong danh sách phổ biến khớp với tìm kiếm. <Link href="/tuyen-duong">Xem tất cả tuyến</Link>.</p>}</section>

      <section className="vehicle-detail-steps"><h2>Các bước đặt xe {category.type} đơn giản</h2><div>{[{ icon: Search, title: "Chọn tuyến", text: "Nhập điểm đón, điểm đến và loại chuyến." }, { icon: CalendarDays, title: "Chọn lịch đi", text: "Chọn ngày giờ phù hợp với kế hoạch của bạn." }, { icon: ClipboardCheck, title: "Xác nhận xe và giá", text: "Nhận thông tin xe và giá qua Zalo hoặc điện thoại." }].map((step, i) => <article key={step.title}><b>{i + 1}</b><step.icon size={33} /><span><strong>{step.title}</strong><small>{step.text}</small></span></article>)}</div></section>

      <div className="vehicle-detail-lower"><section className="vehicle-detail-faq" id="vehicle-detail-faq"><h2>Câu hỏi thường gặp về xe {category.type}</h2><details><summary>Xe {category.type} đón tận nơi không?<ChevronDown size={18} /></summary><p>Có thể đón tại điểm phù hợp với hành trình. Vui lòng gửi địa chỉ cụ thể để được xác nhận khi đặt xe.</p></details><details><summary>Có thể đặt xe {category.type} đi về (khứ hồi) không?<ChevronDown size={18} /></summary><p>Có. Chọn loại chuyến khứ hồi hoặc liên hệ để được tư vấn giá và lịch xe theo hành trình thực tế.</p></details><details><summary>Giá xe {category.type} được xác nhận như thế nào?<ChevronDown size={18} /></summary><p>Giá hiện trên tuyến là mức tham khảo theo gói. Nhân viên sẽ xác nhận điểm đón, lịch trình và chi phí trước chuyến đi.</p></details></section><section className="vehicle-detail-alternatives"><h2>{largerCategories.length ? "Cần thêm chỗ cho đoàn đông hơn?" : "Khám phá thêm lựa chọn xe"}</h2><p>Tham khảo các lựa chọn xe khác để tìm không gian phù hợp với đoàn của bạn.</p><div>{suggestions.map((other) => <Link href={`/loai-xe/${other.slug}`} key={other.slug}><strong>Xe {other.type}</strong><span className="vehicle-detail-other-photo"><Image src="/images/home-vehicle-trio.webp" alt="" fill sizes="100px" style={{ objectPosition: other.slug === "7-cho" ? "center" : "right" }} /></span><small><UsersRound size={14} /> {capacity[other.slug]}</small><b>Xem xe {other.type} <ArrowRight size={14} /></b></Link>)}</div></section></div>
      {(airportRoutes.length > 0 || services.length > 0) && <details className="vehicle-detail-more"><summary>Khám phá thêm dịch vụ và tuyến sân bay <ChevronDown size={17} /></summary><div>{airportRoutes.slice(0, 5).map((item) => <Link key={item.href} href={item.href}>{item.label} <ArrowRight size={14} /></Link>)}{services.slice(0, 4).map((item) => <Link key={item.href} href={item.href}>{item.title} <ArrowRight size={14} /></Link>)}</div></details>}
      <section className="vehicle-detail-contact"><div><h2>Cần tư vấn xe {category.type}?</h2><p>Liên hệ ngay để được tư vấn tuyến đường và báo giá nhanh nhất.</p></div><div><a href={zalo} target="_blank" rel="noopener noreferrer" className="home-button home-button-primary"><MessageCircle size={18} /> Nhắn Zalo</a><Link href="/lien-he" className="home-button home-button-outline"><Mail size={18} /> Gửi yêu cầu</Link><a href={`tel:${SITE_HOTLINE_TEL}`} className="home-button home-button-outline"><Phone size={18} /> Gọi {SITE_HOTLINE}</a></div></section>
    </div><SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "Khám phá", links: [{ label: "Trang chủ", href: "/" }, { label: "Tuyến xe", href: "/tuyen-duong" }, { label: "Loại xe", href: "/loai-xe" }, { label: "Điểm đến", href: "/diem-den" }] }, { title: "Hỗ trợ", links: [{ label: "Câu hỏi thường gặp", href: "/loai-xe#vehicle-detail-faq" }, { label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}
