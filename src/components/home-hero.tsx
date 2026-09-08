"use client";

import { useState } from "react";
import { ArrowRight, BusFront, MapPin, MoveRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const variants = [
  { id: "sunset", label: "Sunset Route", note: "Nắng miền Nam" },
  { id: "ticket", label: "Trip Card", note: "Vé cho hành trình" },
  { id: "night", label: "Night Highway", note: "Đi đêm an tâm" },
] as const;

type HeroVariant = (typeof variants)[number]["id"];

export function HomeHero() {
  const [variant, setVariant] = useState<HeroVariant>("sunset");

  return (
    <section className={`home-hero home-hero--${variant}`} id="top">
      <div className="hero-selector" aria-label="Chọn phiên bản hero">
        <span className="hero-selector-label">Xem giao diện</span>
        <div className="hero-selector-options" role="tablist" aria-label="Ba phiên bản hero">
          {variants.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={variant === item.id}
              className={variant === item.id ? "is-active" : undefined}
              onClick={() => setVariant(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.note}</small>
            </button>
          ))}
        </div>
      </div>

      {variant === "sunset" && (
        <div className="hero-variant hero-sunset">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> Đi đâu cũng có Xe Miền Nam</div>
            <h1>Đi xa hơn.<br /><em>Vui hơn.</em></h1>
            <p>Từ thành phố đến biển xanh, từ miền Tây đến cao nguyên. Những chuyến xe tử tế cho hành trình đáng nhớ.</p>
            <div className="hero-actions">
              <Button size="lg" asChild><a href="#booking">Tìm chuyến xe <ArrowRight data-icon="inline-end" /></a></Button>
              <Link className="text-link" href="/tuyen-duong">Xem các tuyến đường <ArrowRight size={17} /></Link>
            </div>
            <div className="hero-trust"><strong>4.9/5</strong><span>từ hơn 2.000 hành khách</span><span className="trust-rule" /><span>15+ tuyến miền Nam</span></div>
          </div>
          <div className="sunset-scene" aria-label="Minh họa hành trình miền Nam">
            <div className="sunset-disc" /><div className="scene-horizon" /><div className="scene-hill scene-hill-back" /><div className="scene-hill scene-hill-front" />
            <div className="scene-road"><span /><span /><span /></div>
            <div className="scene-pin"><MapPin size={17} fill="currentColor" /> VŨNG TÀU</div>
            <div className="scene-sign"><b>ĐÀ LẠT <MoveRight size={15} /></b><b>CẦN THƠ <MoveRight size={15} /></b></div>
            <BusFront className="scene-bus" size={68} strokeWidth={1.3} />
            <span className="scene-caption">TỬ TẾ TRÊN MỌI CUNG ĐƯỜNG</span>
          </div>
        </div>
      )}

      {variant === "ticket" && (
        <div className="hero-variant hero-ticket">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> THUÊ XE NGUYÊN CHIẾC</div>
            <h1>Một tấm vé.<br /><em>Trọn chuyến đi.</em></h1>
            <p>Chọn điểm đến, ngồi lên xe và để phần còn lại cho chúng tôi. Rõ giá, đúng giờ, không phí ẩn.</p>
            <div className="hero-actions"><Button size="lg" asChild><a href="#booking">Đặt chuyến ngay <ArrowRight data-icon="inline-end" /></a></Button><Link className="text-link" href="/doi-xe">Xem đội xe <ArrowRight size={17} /></Link></div>
          </div>
          <div className="trip-ticket-card">
            <div className="ticket-top"><span>XE MIỀN NAM</span><Sparkles size={17} /></div>
            <div className="ticket-route"><div><small>ĐIỂM ĐI</small><strong>TP. HỒ CHÍ MINH</strong></div><MoveRight /><div><small>ĐIỂM ĐẾN</small><strong>ĐÀ LẠT</strong></div></div>
            <div className="ticket-line" /><div className="ticket-meta"><span><small>HẠNG XE</small><b>Limousine</b></span><span><small>KHỞI HÀNH</small><b>24/7</b></span><span><small>TỪ</small><b>1.200.000đ</b></span></div>
            <div className="ticket-stamp">ĐI TỬ TẾ</div>
          </div>
        </div>
      )}

      {variant === "night" && (
        <div className="hero-variant hero-night">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> ĐƯỜNG XA, CÓ CHÚNG TÔI</div>
            <h1>Đêm nay đi đâu?<br /><em>Cứ yên tâm.</em></h1>
            <p>Những cung đường miền Nam sáng đèn cùng đội xe được chăm sóc kỹ và người tài xế luôn đặt sự an tâm lên trước.</p>
            <div className="hero-actions"><Button size="lg" asChild><a href="#booking">Tìm chuyến đêm <ArrowRight data-icon="inline-end" /></a></Button><Link className="text-link" href="/lien-he">Gọi tư vấn 24/7 <ArrowRight size={17} /></Link></div>
          </div>
          <div className="highway-art" aria-label="Minh họa đường cao tốc ban đêm"><span className="highway-moon" /><span className="highway-line line-a" /><span className="highway-line line-b" /><span className="highway-line line-c" /><div className="highway-destination"><MapPin size={16} fill="currentColor" /> CẦN THƠ <small>03:45</small></div><div className="highway-bus"><BusFront size={74} strokeWidth={1.25} /></div><span className="night-note">SAFE ROUTE / 24—7</span></div>
        </div>
      )}
    </section>
  );
}

export default HomeHero;
