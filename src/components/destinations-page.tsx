"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowRightLeft, CarFront, ChevronDown, MapPin, MessageCircle, Phone, Search, X, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import type { DestinationCard } from "@/types/diem-den";
import { routeHref, type Route } from "@/types/route";
import { canonicalLocationKey, locationMatchesQuery } from "@/lib/location-search";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import { getZaloChatLink } from "@/lib/zalo";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";

const featuredSlugs = ["ba-ria-vung-tau", "dong-nai", "tay-ninh", "can-tho"];
const featuredDescriptions: Record<string, string> = {
  "ba-ria-vung-tau": "Biển xanh, không khí trong lành, điểm đến yêu thích quanh năm.",
  "dong-nai": "Thiên nhiên tươi đẹp, nhiều điểm tham quan hấp dẫn.",
  "tay-ninh": "Núi Bà Đen hùng vĩ, điểm đến tâm linh và khám phá.",
  "can-tho": "Miền Tây sông nước, văn hóa đặc sắc và ẩm thực phong phú.",
};

function destinationMatches(destination: DestinationCard, query: string, routes: Route[]) {
  return locationMatchesQuery(destination.name, query) ||
    routes.some((route) => route.regionSlug === destination.slug &&
      [route.to, route.from].some((place) => locationMatchesQuery(place, query)));
}

function FeaturedCard({ destination }: { destination: DestinationCard }) {
  const name = getPublicLocationLabel(destination);
  return <Link className="dest-featured-card" href={`/tuyen-duong/${destination.slug}`} aria-label={`Xem các tuyến ở ${name}`}>
    {destination.imageUrl ? <Image src={destination.imageUrl} alt="" fill sizes="(max-width: 700px) 100vw, 50vw" /> : <span className="dest-image-fallback"><MapPin aria-hidden="true" /></span>}
    <span className="dest-featured-shade" />
    <span className="dest-featured-content"><strong>{name}</strong><small>{featuredDescriptions[destination.slug] || destination.blurb}</small></span>
    <span className="dest-featured-link">Xem các tuyến <ArrowRight size={16} aria-hidden="true" /></span>
  </Link>;
}

function RegionCard({ destination }: { destination: DestinationCard }) {
  const name = getPublicLocationLabel(destination);
  return <Link className="dest-region-card" href={`/tuyen-duong/${destination.slug}`} aria-label={`Xem các tuyến ở ${name}`}>
    <span className="dest-region-image">{destination.imageUrl ? <Image src={destination.imageUrl} alt="" fill sizes="(max-width: 700px) 50vw, 25vw" /> : <MapPin aria-hidden="true" />}</span>
    <span className="dest-region-footer"><MapPin size={17} aria-hidden="true" /><strong>{name}</strong><span className="dest-region-link">Xem tuyến <ArrowRight size={14} aria-hidden="true" /></span></span>
  </Link>;
}

function JourneyFinder({ routes }: { routes: Route[] }) {
  const router = useRouter();
  const locations = useMemo(() => {
    const unique = new Map<string, string>();
    routes.forEach((route) => [route.from, route.to].forEach((value) => {
      const key = canonicalLocationKey(value);
      if (key && !unique.has(key)) unique.set(key, getPublicLocationLabel(value));
    }));
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "vi"));
  }, [routes]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tripType, setTripType] = useState<"one_way" | "round_trip">("one_way");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to) { setError("Vui lòng chọn điểm đón và điểm đến."); return; }
    if (canonicalLocationKey(from) === canonicalLocationKey(to)) { setError("Điểm đón và điểm đến phải khác nhau."); return; }
    setError("");
    const matching = routes.find((route) =>
      canonicalLocationKey(route.from) === canonicalLocationKey(from) &&
      canonicalLocationKey(route.to) === canonicalLocationKey(to) &&
      (route.pricingV2?.outbound.enabled ?? true));
    const reverse = routes.find((route) =>
      canonicalLocationKey(route.from) === canonicalLocationKey(to) &&
      canonicalLocationKey(route.to) === canonicalLocationKey(from) &&
      Boolean(route.pricingV2?.inbound.enabled));
    const route = matching || reverse;
    if (route) {
      const params = new URLSearchParams({ direction: matching ? "outbound" : "inbound", trip_type: tripType, source: "destination_catalog" });
      router.push(`${routeHref(route)}?${params.toString()}#pricing`);
    } else {
      const params = new URLSearchParams({ from, to });
      router.push(`/tuyen-duong?${params.toString()}#route-catalog`);
    }
  }

  return <section className="dest-finder" aria-labelledby="dest-finder-title">
    <div className="dest-section-heading"><h2 id="dest-finder-title">Đã biết nơi cần đi?</h2><p>Nhập thông tin để xem giá chuyến xe nhanh chóng.</p></div>
    <form onSubmit={submit}>
      <label className="dest-finder-field"><MapPin size={19} aria-hidden="true" /><span><strong>Điểm đón</strong><select value={from} onChange={(event) => { setFrom(event.target.value); setError(""); }} aria-label="Điểm đón" required><option value="">Chọn điểm đón</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select></span><ChevronDown size={15} aria-hidden="true" /></label>
      <button type="button" className="dest-finder-swap" onClick={() => { setFrom(to); setTo(from); setError(""); }} aria-label="Đổi chiều điểm đón và điểm đến"><ArrowRightLeft size={21} /></button>
      <label className="dest-finder-field"><MapPin size={19} aria-hidden="true" /><span><strong>Điểm đến</strong><select value={to} onChange={(event) => { setTo(event.target.value); setError(""); }} aria-label="Điểm đến" required><option value="">Chọn điểm đến</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select></span><ChevronDown size={15} aria-hidden="true" /></label>
      <label className="dest-finder-field"><CarFront size={19} aria-hidden="true" /><span><strong>Loại chuyến</strong><select value={tripType} onChange={(event) => setTripType(event.target.value as "one_way" | "round_trip")} aria-label="Loại chuyến"><option value="one_way">Một chiều</option><option value="round_trip">Khứ hồi</option></select></span><ChevronDown size={15} aria-hidden="true" /></label>
      <button className="home-button home-button-primary dest-finder-submit" type="submit">Xem giá chuyến xe <ArrowRight size={17} aria-hidden="true" /></button>
    </form>
    {error && <p className="dest-finder-error" role="alert">{error}</p>}
  </section>;
}

export function DestinationsPage({ destinations, routes }: { destinations: DestinationCard[]; routes: Route[] }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const featured = featuredSlugs.flatMap((slug) => destinations.filter((item) => item.slug === slug));
  const regions = destinations.filter((item) => !featuredSlugs.includes(item.slug));
  const filteredFeatured = submittedQuery ? featured.filter((item) => destinationMatches(item, submittedQuery, routes)) : featured;
  const filteredRegions = (submittedQuery ? regions.filter((item) => destinationMatches(item, submittedQuery, routes)) : regions).filter((item) => !query || destinationMatches(item, query, routes));
  const zaloLink = getZaloChatLink();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    document.getElementById("dest-featured")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function choose(place: string) {
    setQuery(place);
    setSubmittedQuery(place);
    document.getElementById("dest-featured")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className="site-shell home-redesign dest-redesign">
    <SiteHeader menuItems={navItems.filter((item) => ["Tuyến đường", "Điểm đến", "Loại xe", "Blog", "Liên hệ"].includes(item.label))} hotline={SITE_HOTLINE} hotlineHref={`tel:${SITE_HOTLINE_TEL}`} ctaLabel="Nhắn Zalo" ctaHref={zaloLink || "/lien-he"} homeDesign />
    <section className="dest-hero" aria-labelledby="dest-title"><div className="dest-width dest-hero-inner">
      <div className="dest-hero-copy"><p className="home-eyebrow">KHÁM PHÁ ĐIỂM ĐẾN</p><h1 id="dest-title">Bạn muốn<br />đến đâu?</h1><p>Khám phá điểm đến và chọn tuyến xe riêng phù hợp.</p></div>
      <div className="dest-hero-collage" aria-label="Khám phá Vũng Tàu, Tây Ninh và Cần Thơ">
        {([["ba-ria-vung-tau", "Vũng Tàu"], ["tay-ninh", "Tây Ninh"], ["can-tho", "Cần Thơ"]] as const).map(([slug, label]) => {
          const destination = destinations.find((item) => item.slug === slug);
          return destination && <Link key={slug} className={`dest-collage-item dest-collage-${slug}`} href={`/tuyen-duong/${slug}`} aria-label={`Xem các tuyến ${label}`}>
            {destination.imageUrl && <Image src={destination.imageUrl} alt="" fill priority sizes="(max-width: 700px) 40vw, 35vw" />}
            <span><MapPin size={17} aria-hidden="true" />{label}</span>
          </Link>;
        })}
      </div>
    </div></section>

    <div className="dest-width dest-body">
      <section className="dest-search-panel" aria-label="Tìm điểm đến"><form onSubmit={search} className="dest-search-form"><label><Search size={26} aria-hidden="true" /><span className="sr-only">Tìm điểm đến hoặc khu vực</span><input type="search" placeholder="Tìm điểm đến hoặc khu vực" value={query} onChange={(event) => setQuery(event.target.value)} /></label><button type="submit" className="home-button home-button-primary">Tìm điểm đến <ArrowRight size={18} aria-hidden="true" /></button></form>
        <div className="dest-suggestions"><strong>Gợi ý điểm đến phổ biến:</strong><div>{["Vũng Tàu", "Hồ Tràm", "Tây Ninh", "Cần Thơ", "Đà Lạt"].map((place) => <button type="button" onClick={() => choose(place)} key={place}><MapPin size={16} aria-hidden="true" />{place}</button>)}{submittedQuery && <button type="button" className="dest-clear-search" onClick={() => { setQuery(""); setSubmittedQuery(""); }}><X size={15} aria-hidden="true" />Xóa lọc</button>}</div></div>
      </section>

      <section className="dest-featured" id="dest-featured" aria-labelledby="dest-featured-title"><div className="dest-section-heading"><h2 id="dest-featured-title">Điểm đến nổi bật</h2><p>Những điểm đến được nhiều hành khách lựa chọn.</p></div>
        {filteredFeatured.length > 0 && <div className="dest-featured-grid">{filteredFeatured.map((item) => <FeaturedCard key={item.slug} destination={item} />)}</div>}
      </section>
      <section className="dest-regions" aria-labelledby="dest-regions-title"><div className="dest-region-heading"><div className="dest-section-heading"><h2 id="dest-regions-title">Khám phá theo khu vực</h2><p>Chọn khu vực bạn quan tâm để xem các tuyến xe phù hợp.</p></div><label className="dest-region-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Tìm khu vực hoặc điểm đến</span><input type="search" placeholder="Tìm khu vực hoặc điểm đến..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        {filteredRegions.length > 0 && <div className="dest-region-grid">{filteredRegions.map((item) => <RegionCard key={item.slug} destination={item} />)}</div>}
        {!filteredRegions.length && !filteredFeatured.length && <div className="dest-empty" role="status"><p>Chưa tìm thấy điểm đến phù hợp.</p><button type="button" onClick={() => { setQuery(""); setSubmittedQuery(""); }}>Xem tất cả điểm đến</button></div>}
      </section>
      <section className="dest-steps" aria-labelledby="dest-steps-title"><div className="dest-section-heading"><h2 id="dest-steps-title">Chọn điểm đến, xem tuyến, chọn xe</h2><p>Chỉ với 3 bước đơn giản để tìm chuyến đi phù hợp.</p></div><div className="dest-steps-grid">{([{ icon: Search, title: "Chọn điểm đến", copy: "Tìm khu vực hoặc điểm đến bạn muốn đi." }, { icon: FileText, title: "Xem các tuyến", copy: "Khám phá các tuyến xe phù hợp." }, { icon: CarFront, title: "Chọn xe và đặt", copy: "Chọn loại xe phù hợp và liên hệ đặt chuyến." }] as const).map((step, index) => <div key={step.title}><span className="dest-step-number">{index + 1}</span><step.icon aria-hidden="true" /><p><strong>{step.title}</strong><small>{step.copy}</small></p></div>)}</div></section>
      <JourneyFinder routes={routes} />
      <section className="dest-contact" aria-labelledby="dest-contact-title"><div><h2 id="dest-contact-title">Chưa thấy điểm đến bạn cần?</h2><p>Liên hệ ngay để được tư vấn tuyến đường và báo giá nhanh nhất.</p></div><div className="dest-contact-actions">{zaloLink && <a className="home-button home-button-primary" href={zaloLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />Nhắn Zalo</a>}<a className="home-button home-button-outline" href={`tel:${SITE_HOTLINE_TEL}`}><Phone size={17} />Gọi {SITE_HOTLINE}</a></div></section>
    </div>
    <SiteFooter tagline={<>Alo Đặt Xe cung cấp dịch vụ xe riêng có tài xế từ Sài Gòn và các tỉnh lân cận.<br />Đồng hành cùng bạn trên mọi hành trình.</>} phone={SITE_HOTLINE} phoneHref={`tel:${SITE_HOTLINE_TEL}`} linkGroups={[{ title: "Khám phá", links: [{ label: "Trang chủ", href: "/" }, { label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Loại xe", href: "/loai-xe" }] }, { title: "Hỗ trợ", links: [{ label: "Liên hệ", href: "/lien-he" }] }]} socialLinks={[]} copyright={`© 2026 ${SITE_NAME}. Tất cả quyền được bảo lưu.`} madeFor="Điều khoản dịch vụ  |  Chính sách bảo mật" brandMark="A" brandName={SITE_NAME} />
  </main>;
}

export default DestinationsPage;
