"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bus,
  BusFront,
  CalendarDays,
  Car,
  ChevronDown,
  Clock3,
  Compass,
  MapPin,
  Milestone,
  Sparkles,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, type NavItem } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";

const navItems: NavItem[] = [
  { label: "Tuyến đường", href: "/#routes" },
  { label: "Đội xe", href: "/#fleet" },
  { label: "Loại xe", href: "/#fleet" },
  { label: "Dịch vụ", href: "#" },
  { label: "Khuyến mãi", href: "#" },
  { label: "Blog", href: "/#blog" },
  { label: "Đánh giá", href: "/#stories" },
  { label: "Liên hệ", href: "#" },
];

const routes = [
  { from: "TP. Hồ Chí Minh", to: "Vũng Tàu", time: "2h 15m", distance: "125 km", price: "Từ 140K", vehicleTypes: "4–7 chỗ · 16–29 chỗ · 45 chỗ · Limousine" },
  { from: "TP. Hồ Chí Minh", to: "Cần Thơ", time: "3h 30m", distance: "170 km", price: "Từ 180K", vehicleTypes: "4–7 chỗ · 16–29 chỗ · 45 chỗ" },
  { from: "TP. Hồ Chí Minh", to: "Đà Lạt", time: "6h 30m", distance: "300 km", price: "Từ 290K", vehicleTypes: "4–7 chỗ · Limousine" },
];

const fleetTabs = ["Tất cả", "Đi một mình", "Đi cùng nhóm", "Thuê riêng"] as const;

// 4 nhóm khớp đúng taxonomy vehicle_type trong kiến trúc dữ liệu (mục 3, xemiennam-kien-truc-ky-thuat.md)
const fleet: { type: string; tag: string; detail: string; accent: "sand" | "gold" | "navy" | "orange"; icon: LucideIcon; tabs: (typeof fleetTabs)[number][] }[] = [
  { type: "4–7 chỗ", tag: "Tự lái / có tài xế", detail: "Gia đình, cặp đôi, công tác. Tự lái hoặc có tài xế.", accent: "sand", icon: Car, tabs: ["Đi một mình"] },
  { type: "16–29 chỗ", tag: "Đi theo lịch trình", detail: "Nhóm bạn, công ty, đoàn nhỏ đi theo lịch trình.", accent: "gold", icon: Bus, tabs: ["Đi cùng nhóm"] },
  { type: "45 chỗ", tag: "Đoàn lớn", detail: "Đoàn lớn, công ty, trường học cho chuyến đi xa.", accent: "navy", icon: BusFront, tabs: ["Đi cùng nhóm"] },
  { type: "Limousine", tag: "Ghế nằm massage", detail: "Cabin rộng, ghế nằm massage — phù hợp tuyến dài.", accent: "orange", icon: Sparkles, tabs: ["Thuê riêng"] },
];

const stats = [
  { value: "15+", label: "tuyến cố định miền Nam" },
  { value: "4–45", label: "chỗ, đủ loại xe" },
  { value: "24/7", label: "tổng đài & Zalo hỗ trợ" },
  { value: "0đ", label: "phụ phí phát sinh" },
];

const blogPosts = [
  { category: "Kinh nghiệm", title: "Đi Vũng Tàu 2 ngày 1 đêm cho gia đình có trẻ nhỏ", icon: Compass },
  { category: "Cẩm nang", title: "Thuê xe 16 chỗ đi Đà Lạt cần lưu ý gì trước khi đặt", icon: BookOpen },
  { category: "Review", title: "Các trạm dừng chân trên cao tốc TP.HCM – Long Thành – Dầu Giây", icon: MapPin },
];

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/#routes" },
      { label: "Đội xe", href: "/#fleet" },
      { label: "Cẩm nang đi đường", href: "/#blog" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Tra cứu vé", href: "#" },
      { label: "Chính sách hoàn vé", href: "#" },
      { label: "Liên hệ", href: "/#booking" },
    ],
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function RouteCard({ route }: { route: (typeof routes)[number] }) {
  return (
    <article className="route-ticket">
      <div className="rt-price"><span>Giá từ</span><b>{route.price}</b></div>
      <div className="rt-body">
        <div className="rt-route"><span>{route.from}</span><ArrowRight size={16} /><span>{route.to}</span></div>
        <div className="rt-meta">
          <span><Clock3 size={13} /> {route.time}</span>
          <span><Milestone size={13} /> {route.distance}</span>
          <span className="rt-vehicles">{route.vehicleTypes}</span>
        </div>
      </div>
      <div className="rt-cta"><a href="#booking">Xem chi tiết <ArrowRight size={14} /></a></div>
    </article>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<(typeof fleetTabs)[number]>("Tất cả");

  return (
    <main className="site-shell">
      <SiteHeader menuItems={navItems} hotline="1900 6789" ctaLabel="Đặt xe ngay" ctaHref="/#booking" />

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> Đi đâu cũng có Xe Miền Nam</div>
          <h1>Đi xa hơn.<br /><em>Vui hơn.</em></h1>
          <p>Từ thành phố đến biển xanh, từ miền Tây đến cao nguyên. Những chuyến xe tử tế cho hành trình đáng nhớ.</p>
          <div className="hero-actions"><Button size="lg" onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}>Tìm chuyến xe <ArrowRight data-icon="inline-end" /></Button><a className="text-link" href="#routes">Xem các tuyến đường <ArrowRight size={17} /></a></div>
          <div className="hero-trust"><div className="avatar-stack"><span>H</span><span>M</span><span>T</span></div><span><strong>4.9/5</strong> từ hơn 2.000 hành khách</span></div>
        </div>
        <div className="hero-visual" aria-label="Minh họa tuyến đường miền Nam">
          <div className="sun" /><div className="horizon" /><div className="hill hill-back" /><div className="hill hill-front" />
          <div className="road"><span className="road-mark mark-1" /><span className="road-mark mark-2" /><span className="road-mark mark-3" /></div>
          <div className="route-pin"><MapPin size={17} fill="currentColor" /> <span>VŨNG TÀU</span></div>
          <div className="signpost"><div className="sign sign-top">ĐÀ LẠT <ArrowRight size={16} /></div><div className="sign sign-bottom">CẦN THƠ <ArrowRight size={16} /></div><span className="pole" /></div>
          <div className="bus-illustration"><BusFront size={62} strokeWidth={1.4} /><span className="bus-window" /><span className="bus-wheel wheel-one" /><span className="bus-wheel wheel-two" /></div>
          <span className="visual-note note-one">SINCE 2012</span><span className="visual-note note-two">TỬ TẾ TRÊN MỌI CUNG ĐƯỜNG</span>
        </div>
      </section>

      <div className="ticker-section" aria-label="Các tuyến phổ biến">
        <div className="ticker-track">
          {[...routes, ...routes].map((r, i) => (
            <span className="ticker-sign" key={`${r.to}-${i}`}>{r.from} <ArrowRight size={13} /> {r.to}<small>{r.distance}</small></span>
          ))}
        </div>
      </div>

      <section className="booking-bar" id="booking">
        <div className="booking-field"><MapPin size={18} /><div><span>Điểm đi</span><strong>TP. Hồ Chí Minh</strong></div><ChevronDown size={17} /></div>
        <div className="booking-field"><MapPin size={18} /><div><span>Điểm đến</span><strong>Chọn điểm đến</strong></div><ChevronDown size={17} /></div>
        <div className="booking-field"><CalendarDays size={18} /><div><span>Ngày đi</span><strong>Chọn ngày</strong></div><ChevronDown size={17} /></div>
        <Button size="lg">Tìm chuyến <ArrowRight data-icon="inline-end" /></Button>
      </section>

      <section className="routes-section section-wrap" id="routes"><div className="section-heading"><div><SectionLabel>CÁC TUYẾN PHỔ BIẾN</SectionLabel><h2>Đi đâu hôm nay?</h2></div><a className="text-link" href="#routes">Xem tất cả tuyến <ArrowRight size={17} /></a></div><div className="route-list">{routes.map((route) => <RouteCard key={route.to} route={route} />)}</div></section>

      <section className="fleet-section section-wrap" id="fleet"><div className="section-heading"><div><SectionLabel>ĐỘI XE</SectionLabel><h2>Chọn xe theo số người, không theo số ghế trống.</h2></div><p className="heading-note">Từ xe con tự lái đến xe<br />giường nằm limousine.</p></div><div className="fleet-tabs">{fleetTabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div><div className="fleet-grid">{fleet.filter((item) => activeTab === "Tất cả" || item.tabs.includes(activeTab)).map((item) => <article className={`fleet-card ${item.accent}`} key={item.type}><div className="fleet-image"><item.icon size={56} strokeWidth={1.3} /><span className="fleet-sticker">{item.tag}</span></div><div className="fleet-info"><span className="fleet-kicker">XE MIỀN NAM</span><h3>{item.type}</h3><p>{item.detail}</p><a href="#booking">Xem chi tiết <ArrowRight size={15} /></a></div></article>)}</div></section>

      <section className="stats-section"><div className="stats-band">{stats.map((s) => <div className="stat" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}</div></section>

      <section className="promise-section" id="about"><div className="promise-art"><div className="ticket-big"><Ticket size={29} /><span>VÉ MỘT CHIỀU</span><strong>ĐI TỬ TẾ</strong><small>XE MIỀN NAM · 2012—2024</small></div></div><div className="promise-copy"><SectionLabel>ĐIỀU CHÚNG TÔI TIN</SectionLabel><h2>Không chỉ là một chuyến xe.</h2><p>Chúng tôi tin mỗi hành trình đều có thể bắt đầu bằng một nụ cười, một tài xế tử tế và chiếc xe luôn đúng giờ.</p><ul><li><ShieldCheck size={20} /><span><strong>An toàn là ưu tiên</strong><br />Bảo dưỡng định kỳ, tài xế tận tâm.</span></li><li><Users size={20} /><span><strong>Phục vụ như người nhà</strong><br />Luôn lắng nghe và hỗ trợ bạn.</span></li></ul><a className="text-link" href="#stories">Câu chuyện của chúng tôi <ArrowRight size={17} /></a></div></section>

      <section className="stories-section section-wrap" id="stories"><div className="section-heading"><div><SectionLabel>HÀNH KHÁCH NÓI GÌ</SectionLabel><h2>Chuyện trên những cung đường.</h2></div><div className="rating"><Star size={18} fill="currentColor" /><strong>4.9</strong><span> / 5.0</span></div></div><div className="quote-grid"><blockquote>“Lần đầu đi Đà Lạt bằng xe giường nằm mà thoải mái hơn mình nghĩ rất nhiều. Tài xế vui tính, xe sạch sẽ, đến nơi đúng giờ.”<footer><span className="quote-avatar">L</span><strong>Lan Anh</strong><span>· TP. Hồ Chí Minh → Đà Lạt</span></footer></blockquote><blockquote>“Đặt xe riêng cho gia đình đi Vũng Tàu, được đón tận nhà nên người lớn tuổi rất thích. Sẽ quay lại!”<footer><span className="quote-avatar">Q</span><strong>Quang Minh</strong><span>· TP. Hồ Chí Minh → Vũng Tàu</span></footer></blockquote></div></section>

      <section className="blog-section section-wrap" id="blog"><div className="section-heading"><div><SectionLabel>BLOG</SectionLabel><h2>Cẩm nang trước khi lên xe.</h2></div><a className="text-link" href="#blog">Xem tất cả bài viết <ArrowRight size={17} /></a></div><div className="route-grid blog-grid">{blogPosts.map((post) => <article className="blog-card" key={post.title}><div className="blog-thumb"><post.icon size={26} /></div><div className="blog-body"><span className="blog-cat">{post.category}</span><h3>{post.title}</h3></div></article>)}</div></section>

      <section className="final-cta"><div><SectionLabel>SẴN SÀNG LÊN ĐƯỜNG?</SectionLabel><h2>Hành trình của bạn,<br /><em>chúng tôi lo.</em></h2></div><div><p>Đặt chuyến nhanh chóng, rõ ràng<br />và không có phí ẩn.</p><Button size="lg">Bắt đầu đặt xe <ArrowRight data-icon="inline-end" /></Button></div></section>

      <SiteFooter
        tagline={<>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</>}
        phone="1900 6789"
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright="© 2026 Xe Miền Nam"
        madeFor="Made for the road."
      />
    </main>
  );
}
