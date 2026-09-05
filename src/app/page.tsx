"use client";

import { useState } from "react";
import {
  ArrowRight,
  BusFront,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const routes = [
  { from: "TP. Hồ Chí Minh", to: "Vũng Tàu", time: "2h 15m", price: "Từ 140K", color: "orange" },
  { from: "TP. Hồ Chí Minh", to: "Cần Thơ", time: "3h 30m", price: "Từ 180K", color: "yellow" },
  { from: "TP. Hồ Chí Minh", to: "Đà Lạt", time: "6h 30m", price: "Từ 290K", color: "orange" },
];

const fleet = [
  { type: "Limousine", seats: "9 chỗ", detail: "Ghế massage · USB · Wifi", accent: "lime" },
  { type: "Giường nằm", seats: "34 chỗ", detail: "Rèm riêng · Chăn gối · Nước suối", accent: "orange" },
  { type: "Xe hợp đồng", seats: "4–45 chỗ", detail: "Đi riêng · Đón tận nơi · Linh hoạt", accent: "yellow" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function RouteCard({ route }: { route: (typeof routes)[number] }) {
  return (
    <button className="route-card group" aria-label={`Đặt xe ${route.from} đi ${route.to}`}>
      <div className="route-card-top">
        <span className={`route-dot ${route.color}`} />
        <span className="route-time"><Clock3 size={14} /> {route.time}</span>
      </div>
      <div className="route-names"><strong>{route.from}</strong><ArrowRight size={18} /><strong>{route.to}</strong></div>
      <div className="route-card-bottom"><span>{route.price}</span><span className="link-arrow">Đặt ngay <ArrowRight size={15} /></span></div>
    </button>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Tất cả");

  return (
    <main className="site-shell">
      <header className="site-header">
        <a href="#top" className="brand" aria-label="Xe Miền Nam trang chủ"><span className="brand-mark">XM</span><span>XE MIỀN NAM</span></a>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Điều hướng chính">
          <a href="#routes" onClick={() => setMenuOpen(false)}>Tuyến đường</a>
          <a href="#fleet" onClick={() => setMenuOpen(false)}>Dòng xe</a>
          <a href="#stories" onClick={() => setMenuOpen(false)}>Cẩm nang</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>Về chúng tôi</a>
          <Button className="nav-cta" onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}>Đặt xe <ArrowRight data-icon="inline-end" /></Button>
        </nav>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Đóng menu" : "Mở menu"}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

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

      <section className="booking-bar" id="booking">
        <div className="booking-field"><MapPin size={18} /><div><span>Điểm đi</span><strong>TP. Hồ Chí Minh</strong></div><ChevronDown size={17} /></div>
        <div className="booking-field"><MapPin size={18} /><div><span>Điểm đến</span><strong>Chọn điểm đến</strong></div><ChevronDown size={17} /></div>
        <div className="booking-field"><CalendarDays size={18} /><div><span>Ngày đi</span><strong>Chọn ngày</strong></div><ChevronDown size={17} /></div>
        <Button size="lg">Tìm chuyến <ArrowRight data-icon="inline-end" /></Button>
      </section>

      <section className="routes-section section-wrap" id="routes"><div className="section-heading"><div><SectionLabel>CÁC TUYẾN PHỔ BIẾN</SectionLabel><h2>Đi đâu hôm nay?</h2></div><a className="text-link" href="#routes">Xem tất cả tuyến <ArrowRight size={17} /></a></div><div className="route-grid">{routes.map((route) => <RouteCard key={route.to} route={route} />)}</div></section>

      <section className="fleet-section section-wrap" id="fleet"><div className="section-heading"><div><SectionLabel>CHỌN ĐÚNG CHUYẾN ĐI</SectionLabel><h2>Một chiếc xe cho mỗi câu chuyện.</h2></div><p className="heading-note">Thoải mái, an tâm và vừa vặn<br />với cách bạn muốn đi.</p></div><div className="fleet-tabs">{["Tất cả", "Đi một mình", "Đi cùng nhóm", "Thuê riêng"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div><div className="fleet-grid">{fleet.map((item) => <article className={`fleet-card ${item.accent}`} key={item.type}><div className="fleet-image"><BusFront size={92} strokeWidth={1} /><span className="fleet-sticker">{item.seats}</span></div><div className="fleet-info"><span className="fleet-kicker">XE MIỀN NAM</span><h3>{item.type}</h3><p>{item.detail}</p><a href="#booking">Xem chi tiết <ArrowRight size={15} /></a></div></article>)}</div></section>

      <section className="promise-section" id="about"><div className="promise-art"><div className="ticket-big"><Ticket size={29} /><span>VÉ MỘT CHIỀU</span><strong>ĐI TỬ TẾ</strong><small>XE MIỀN NAM · 2012—2024</small></div></div><div className="promise-copy"><SectionLabel>ĐIỀU CHÚNG TÔI TIN</SectionLabel><h2>Không chỉ là một chuyến xe.</h2><p>Chúng tôi tin mỗi hành trình đều có thể bắt đầu bằng một nụ cười, một tài xế tử tế và chiếc xe luôn đúng giờ.</p><ul><li><ShieldCheck size={20} /><span><strong>An toàn là ưu tiên</strong><br />Bảo dưỡng định kỳ, tài xế tận tâm.</span></li><li><Users size={20} /><span><strong>Phục vụ như người nhà</strong><br />Luôn lắng nghe và hỗ trợ bạn.</span></li></ul><a className="text-link" href="#stories">Câu chuyện của chúng tôi <ArrowRight size={17} /></a></div></section>

      <section className="stories-section section-wrap" id="stories"><div className="section-heading"><div><SectionLabel>HÀNH KHÁCH NÓI GÌ</SectionLabel><h2>Chuyện trên những cung đường.</h2></div><div className="rating"><Star size={18} fill="currentColor" /><strong>4.9</strong><span> / 5.0</span></div></div><div className="quote-grid"><blockquote>“Lần đầu đi Đà Lạt bằng xe giường nằm mà thoải mái hơn mình nghĩ rất nhiều. Tài xế vui tính, xe sạch sẽ, đến nơi đúng giờ.”<footer><span className="quote-avatar">L</span><strong>Lan Anh</strong><span>· TP. Hồ Chí Minh → Đà Lạt</span></footer></blockquote><blockquote>“Đặt xe riêng cho gia đình đi Vũng Tàu, được đón tận nhà nên người lớn tuổi rất thích. Sẽ quay lại!”<footer><span className="quote-avatar">Q</span><strong>Quang Minh</strong><span>· TP. Hồ Chí Minh → Vũng Tàu</span></footer></blockquote></div></section>

      <section className="final-cta"><div><SectionLabel>SẴN SÀNG LÊN ĐƯỜNG?</SectionLabel><h2>Hành trình của bạn,<br /><em>chúng tôi lo.</em></h2></div><div><p>Đặt chuyến nhanh chóng, rõ ràng<br />và không có phí ẩn.</p><Button size="lg">Bắt đầu đặt xe <ArrowRight data-icon="inline-end" /></Button></div></section>

      <footer className="site-footer"><div className="footer-main"><a href="#top" className="brand"><span className="brand-mark">XM</span><span>XE MIỀN NAM</span></a><p>Đi đâu cũng có Xe Miền Nam.<br />Kết nối những hành trình tử tế.</p><a className="phone-link" href="tel:19001234"><Phone size={17} /> 1900 1234</a></div><div className="footer-links"><div><span>KHÁM PHÁ</span><a href="#routes">Tuyến đường</a><a href="#fleet">Dòng xe</a><a href="#stories">Cẩm nang đi đường</a></div><div><span>HỖ TRỢ</span><a href="#booking">Tra cứu vé</a><a href="#booking">Chính sách hoàn vé</a><a href="#booking">Liên hệ</a></div><div><span>THEO DÕI CHÚNG TÔI</span><a href="#top">◎ Instagram</a><a href="#top">Facebook</a></div></div><div className="footer-bottom"><span>© 2024 Xe Miền Nam</span><span>Made for the road.</span></div></footer>
    </main>
  );
}
