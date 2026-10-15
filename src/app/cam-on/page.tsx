import { BookingThankYou } from "@/components/booking-thank-you";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_HOTLINE, SITE_HOTLINE_TEL } from "@/lib/site-config";
import { getZaloChatLink } from "@/lib/zalo";
import "../home-redesign.css";
import "./thank-you.css";

export const metadata = buildPageMetadata({ title: "Cảm ơn bạn", description: "Thông tin sau khi gửi yêu cầu tới Alo Đặt Xe.", path: "/cam-on", noIndex: true });
export default function Page() {
  return <main className="site-shell home-redesign"><SiteHeader menuItems={navItems} hotline={SITE_HOTLINE} hotlineHref={"tel:" + SITE_HOTLINE_TEL} ctaLabel="Nhắn Zalo" ctaHref={getZaloChatLink()} homeDesign /><BookingThankYou /><SiteFooter /></main>;
}
