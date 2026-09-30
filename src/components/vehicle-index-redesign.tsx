"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowRightLeft, CarFront, ChevronDown, CircleHelp, Info, MapPin, MessageCircle, Phone, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { canonicalLocationKey } from "@/lib/location-search";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { routeComboHref, routeHref, type Route } from "@/types/route";
import type { VehicleCategory } from "@/types/vehicle-category";

const featuredCopy: Record<string, { count: string; description: string; imageClass: string }> = {
  "4-cho": { count: "1 – 3 người", description: "Phù hợp cho cặp đôi, gia đình nhỏ hoặc nhóm bạn ít người.", imageClass: "car-left" },
  "7-cho": { count: "3 – 6 người", description: "Rộng rãi, thoải mái cho gia đình và nhóm bạn.", imageClass: "car-center" },
  "16-cho": { count: "7 – 14 người", description: "Phù hợp cho nhóm đông, công ty, đoàn du lịch.", imageClass: "car-right" },
};
const otherCopy: Record<string, { audience: string; description: string }> = {
  "29-cho": { audience: "Đoàn vừa", description: "Phù hợp cho đoàn công ty, trường học, nhóm du lịch." },
  "45-cho": { audience: "Đoàn đông", description: "Rộng rãi, thoải mái cho đoàn lớn." },
  limousine: { audience: "Trải nghiệm cao cấp", description: "Không gian sang trọng, thoải mái hơn trên hành trình." },
};
const groups = [
  { label: "1 – 3 người", hint: "Phù hợp xe 4 chỗ", slug: "4-cho", icon: UsersRound },
  { label: "3 – 6 người", hint: "Phù hợp xe 7 chỗ", slug: "7-cho", icon: UsersRound },
  { label: "7 – 14 người", hint: "Phù hợp xe 16 chỗ", slug: "16-cho", icon: UsersRound },
  { label: "Đoàn đông", hint: "Phù hợp xe 29 – 45 chỗ", slug: "29-cho", icon: UsersRound },
] as const;

function VehicleImage({ category, primary = false }: { category: VehicleCategory; primary?: boolean }) {
  const imageClass = featuredCopy[category.slug]?.imageClass;
  if (imageClass) return <span className={`vehicle-index-image vehicle-index-trio ${imageClass}`} role="img" aria-label={`Minh họa ${category.type}`} />;
  return <span className="vehicle-index-image">{category.imageUrl ? <Image src={category.imageUrl} alt={`Minh họa ${category.type}`} fill sizes={primary ? "(max-width: 700px) 50vw, 33vw" : "(max-width: 700px) 40vw, 33vw"} /> : <CarFront size={46} />}</span>;
}

function RouteFinder({ routes, categories }: { routes: Route[]; categories: VehicleCategory[] }) {
  const router = useRouter();
  const locations = useMemo(() => {
    const unique = new Map<string, string>();
    routes.forEach((route) => [route.from, route.to].filter((value) => !/^City Tour/i.test(value)).forEach((value) => {
      const key = canonicalLocationKey(value);
      if (key && !unique.has(key)) unique.set(key, getPublicLocationLabel(value));
    }));
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "vi"));
  }, [routes]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tripType, setTripType] = useState("one_way");
  const [vehicle, setVehicle] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to) { setError("Vui lòng chọn điểm đón và điểm đến."); return; }
    if (canonicalLocationKey(from) === canonicalLocationKey(to)) { setError("Điểm đón và điểm đến phải khác nhau."); return; }
    setError("");
    const matching = routes.find((route) => canonicalLocationKey(route.from) === canonicalLocationKey(from) && canonicalLocationKey(route.to) === canonicalLocationKey(to) && (route.pricingV2?.outbound.enabled ?? true));
    const reverse = routes.find((route) => canonicalLocationKey(route.to) === canonicalLocationKey(from) && canonicalLocationKey(route.from) === canonicalLocationKey(to) && Boolean(route.pricingV2?.inbound.enabled));
    const route = matching || reverse;
    if (route) {
      const direction = matching ? "outbound" : "inbound";
      const vehicleType = categories.find((item) => item.slug === vehicle)?.type;
      const hasVehicle = vehicleType && (route.pricingV2
        ? route.pricingV2.outbound.enabled && route.pricingV2.outbound.packages.some((item) => item.vehicleType === vehicleType && (item.mode === "contact" || (item.mode === "fixed" && typeof item.price === "number" && item.price > 0)))
        : route.pricingByVehicle.some((item) => item.vehicleType === vehicleType));
      const href = hasVehicle ? routeComboHref(route, vehicle) : routeHref(route);
      const params = new URLSearchParams({ direction, trip_type: tripType, source: "vehicle_catalog" });
      router.push(`${href}?${params.toString()}#pricing`);
    } else {
      const params = new URLSearchParams({ from, to });
      router.push(`/tuyen-duong?${params.toString()}#route-catalog`);
    }
  }
  return <section className="vehicle-index-finder" aria-labelledby="vehicle-index-finder-title">
    <div className="vehicle-index-heading"><h2 id="vehicle-index-finder-title">Đã chọn xe, tìm tuyến phù hợp</h2><p>Nhập thông tin để xem giá và tư vấn tuyến đường phù hợp.</p></div>
    <form onSubmit={submit}>
      <label className="vehicle-index-field"><MapPin size={20} /><span><strong>Điểm đón</strong><select required value={from} onChange={(event) => { setFrom(event.target.value); setError(""); }}><option value="">Chọn điểm đón</option>{locations.map((item) => <option key={item}>{item}</option>)}</select></span><ChevronDown size={16} /></label>
      <button type="button" className="vehicle-index-swap" aria-label="Đổi chiều điểm đón và điểm đến" onClick={() => { setFrom(to); setTo(from); setError(""); }}><ArrowRightLeft size={21} /></button>
      <label className="vehicle-index-field"><MapPin size={20} /><span><strong>Điểm đến</strong><select required value={to} onChange={(event) => { setTo(event.target.value); setError(""); }}><option value="">Chọn điểm đến</option>{locations.map((item) => <option key={item}>{item}</option>)}</select></span><ChevronDown size={16} /></label>
      <label className="vehicle-index-field"><CarFront size={20} /><span><strong>Loại chuyến</strong><select value={tripType} onChange={(event) => setTripType(event.target.value)}><option value="one_way">Một chiều</option><option value="round_trip">Khứ hồi</option></select></span><ChevronDown size={16} /></label>
      <label className="vehicle-index-field"><CarFront size={20} /><span><strong>Loại xe</strong><select value={vehicle} onChange={(event) => setVehicle(event.target.value)}><option value="">Chọn loại xe</option>{categories.map((item) => <option key={item.slug} value={item.slug}>Xe {item.type}</option>)}</select></span><ChevronDown size={16} /></label>
      <button className="home-button home-button-primary vehicle-index-submit" type="submit">Xem giá chuyến xe <ArrowRight size={16} /></button>
    </form>
    {error && <p className="vehicle-index-error" role="alert">{error}</p>}
    <p className="vehicle-index-note"><Info size={16} /> Nếu chưa có giá, hệ thống tiếp nhận yêu cầu báo giá và sẽ liên hệ sớm nhất.</p>
  </section>;
}

export function VehicleIndexRedesign({ categories, routes }: { categories: VehicleCategory[]; routes: Route[] }) {
  const [selectedGroup, setSelectedGroup] = useState("7-cho");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const zaloLink = getZaloChatLink();
  const bySlug = (slug: string) => categories.find((item) => item.slug === slug);
  const questions = [
    { question: "Nên chọn loại xe theo số lượng ghế như thế nào?", answer: "Hãy tính cả số hành khách và hành lý. Xe 4 chỗ thường phù hợp 1–3 khách, xe 7 chỗ 3–6 khách và xe 16 chỗ 7–14 khách. Chúng tôi sẽ xác nhận cấu hình xe khi tư vấn." },
    { question: "Giá chuyến xe được xác nhận như thế nào?", answer: "Chọn tuyến và loại xe để xem giá đang có. Với hành trình hoặc gói chưa có giá, hãy gửi yêu cầu để nhận báo giá trước khi đặt chuyến." },
    { question: "Hành lý có ảnh hưởng đến việc chọn loại xe không?", answer: "Có. Số hành khách, lượng hành lý và kích thước đồ mang theo đều ảnh hưởng đến xe phù hợp. Vui lòng cho biết nhu cầu thực tế khi liên hệ." },
  ];
  return <main className="site-shell home-redesign vehicle-index-redesign">
    <SiteHeader menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Blog", "Liên hệ"].includes(item.label))} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink} homeDesign />
    <section className="vehicle-index-hero" aria-labelledby="vehicle-index-title"><div className="vehicle-index-hero-photo" aria-hidden="true" /><div className="vehicle-index-width vehicle-index-hero-inner"><div className="vehicle-index-hero-copy"><p className="home-eyebrow">CHỌN LOẠI XE</p><h1 id="vehicle-index-title">Chọn xe vừa<br />với hành trình</h1><p>Xe riêng có tài xế cho cặp đôi, gia đình và nhóm đông.</p><div className="vehicle-index-hero-pills"><span><CarFront size={22} /><strong>Xe riêng<small>Chủ động, thoải mái</small></strong></span><span><UsersRound size={22} /><strong>Có tài xế<small>An toàn, đúng giờ</small></strong></span></div></div></div></section>
    <div className="vehicle-index-width vehicle-index-body">
      <section className="vehicle-index-selector" aria-labelledby="vehicle-index-selector-title"><h2 id="vehicle-index-selector-title">Bạn đi cùng bao nhiêu người?</h2><div className="vehicle-index-selector-row">{groups.map((group, index) => <button type="button" className={selectedGroup === group.slug ? "is-selected" : ""} aria-pressed={selectedGroup === group.slug} key={group.slug} onClick={() => { setSelectedGroup(group.slug); document.getElementById(index < 3 ? `vehicle-card-${group.slug}` : "vehicle-index-other")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><group.icon size={23} /><span><strong>{group.label}</strong><small>{group.hint}</small></span>{group.slug === "7-cho" && <em>Phổ biến nhất</em>}</button>)}<p><Info size={18} /> Số hành khách thực tế và hành lý được xác nhận khi tư vấn.</p></div></section>
      <section className="vehicle-index-featured" aria-labelledby="vehicle-index-featured-title"><div className="vehicle-index-heading vehicle-index-heading-action"><div><h2 id="vehicle-index-featured-title">Khám phá các loại xe</h2><p>Chọn loại xe phù hợp với số lượng hành khách và nhu cầu của bạn.</p></div><a href={zaloLink} target="_blank" rel="noopener noreferrer" className="home-button home-button-primary"><MessageCircle size={18} /> Nhắn Zalo tư vấn <ArrowRight size={17} /></a></div><div className="vehicle-index-featured-grid">{["4-cho", "7-cho", "16-cho"].map((slug) => { const category = bySlug(slug); if (!category) return null; const copy = featuredCopy[slug]; return <article className="vehicle-index-featured-card" id={`vehicle-card-${slug}`} key={slug}><Link href={`/loai-xe/${slug}`} className="vehicle-index-featured-photo" aria-label={`Xem xe ${category.type}`}><VehicleImage category={category} primary />{slug === "7-cho" && <span className="vehicle-index-popular">Được đặt nhiều nhất</span>}</Link><div className="vehicle-index-featured-body"><h3><Link href={`/loai-xe/${slug}`}>Xe {category.type}</Link></h3><p className="vehicle-index-capacity"><UsersRound size={18} /> {copy.count}</p><p>{copy.description}</p><Link className="home-button home-button-primary" href={`/loai-xe/${slug}`}>Xem xe và tuyến phù hợp <ArrowRight size={17} /></Link></div></article>; })}</div></section>
      <section className="vehicle-index-other" id="vehicle-index-other" aria-labelledby="vehicle-index-other-title"><div className="vehicle-index-heading"><h2 id="vehicle-index-other-title">Xe cho đoàn và nhu cầu riêng</h2><p>Các lựa chọn khác đáp ứng đa dạng nhu cầu di chuyển.</p></div><div className="vehicle-index-other-grid">{["29-cho", "45-cho", "limousine"].map((slug) => { const category = bySlug(slug); if (!category) return null; const copy = otherCopy[slug]; return <Link href={`/loai-xe/${slug}`} className="vehicle-index-other-card" key={slug}><VehicleImage category={category} /><span className="vehicle-index-other-body"><strong>{slug === "limousine" ? "Limousine" : `Xe ${category.type}`}</strong><small><UsersRound size={16} /> {copy.audience}</small><span>{copy.description}</span><b>Xem chi tiết <ArrowRight size={16} /></b></span></Link>; })}</div></section>
      <section className="vehicle-index-needs" aria-labelledby="vehicle-index-needs-title"><div className="vehicle-index-heading"><h2 id="vehicle-index-needs-title">Chọn xe theo nhu cầu</h2><p>Gợi ý nhanh để bạn dễ dàng lựa chọn loại xe phù hợp.</p></div><div className="vehicle-index-needs-grid">{([{ slug: "4-cho", title: "Đi ít người", description: "Cặp đôi, gia đình nhỏ", count: "1 – 3 người" }, { slug: "7-cho", title: "Gia đình / nhóm bạn", description: "Thoải mái, rộng rãi", count: "3 – 6 người" }, { slug: "16-cho", title: "Đoàn đông", description: "Công ty, đoàn du lịch", count: "7 – 45 người" }] as const).map((item) => { const category = bySlug(item.slug); return category && <Link href={`/loai-xe/${item.slug}`} key={item.slug}><span className="vehicle-index-needs-icon"><UsersRound size={27} /></span><span className="vehicle-index-needs-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className={`vehicle-index-needs-car ${featuredCopy[item.slug].imageClass}`} aria-hidden="true" /><span className="vehicle-index-needs-kind"><strong>Xe {category.type}{item.slug === "16-cho" ? " trở lên" : ""}</strong><small><UsersRound size={15} /> {item.count}</small></span><ArrowRight className="vehicle-index-needs-arrow" size={17} /></Link>; })}</div></section>
      <RouteFinder routes={routes} categories={categories} />
      <section className="vehicle-index-faq" aria-labelledby="vehicle-index-faq-title"><div className="vehicle-index-heading"><h2 id="vehicle-index-faq-title">Câu hỏi thường gặp</h2><p>Một số thắc mắc phổ biến khi chọn loại xe.</p></div><div>{questions.map((item, index) => <details key={item.question} open={openQuestion === index} onClick={(event) => { event.preventDefault(); setOpenQuestion(openQuestion === index ? null : index); }}><summary><CircleHelp size={19} />{item.question}</summary><p>{item.answer}</p></details>)}</div></section>
      <section className="vehicle-index-contact" aria-labelledby="vehicle-index-contact-title"><div><h2 id="vehicle-index-contact-title">Chưa biết chọn xe nào?</h2><p>Liên hệ ngay để được tư vấn loại xe phù hợp với hành trình của bạn.</p></div><div><a href={zaloLink} target="_blank" rel="noopener noreferrer" className="home-button home-button-primary"><MessageCircle size={18} /> Nhắn Zalo để được tư vấn</a><a href={`tel:${SITE_HOTLINE_TEL}`} className="home-button home-button-outline"><Phone size={18} /> Gọi {SITE_HOTLINE}</a></div></section>
    </div>
    <SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "KHÁM PHÁ", links: [{ label: "Trang chủ", href: "/" }, { label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Điểm đến", href: "/diem-den" }, { label: "Loại xe", href: "/loai-xe" }] }, { title: "HỖ TRỢ", links: [{ label: "Câu hỏi thường gặp", href: "/loai-xe#vehicle-index-faq-title" }, { label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}
