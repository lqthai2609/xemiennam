import Link from "next/link";
import { ArrowDown, ArrowRight, CheckCircle2, MapPin, MessageCircle, Phone, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { buildFaqPageSchema } from "@/lib/schema";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { navItems } from "@/data/nav";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME, SITE_CONTACT_PHONE_TEL } from "@/lib/site-config";
import { getAirportHubReadiness, type AirportReadinessPhase } from "@/lib/airport-readiness";
import { airportDisplayName } from "@/lib/airport-seo";
import type { AirportHubData, AirportHubRoute } from "@/lib/api/airport-routes";

function buildAirportFaqs(airportName: string, phase: AirportReadinessPhase = "live") {
  if (phase === "prelaunch") {
    return [
      {
        question: `Gocar VN đã mở dịch vụ tại ${airportName} chưa?`,
        answer: `${SITE_NAME} đang chuẩn bị các tuyến đón và trả khách cho giai đoạn sân bay đi vào khai thác. Lịch khai thác thực tế cần đối chiếu thông báo chính thức trước khi chốt hành trình.`,
      },
      {
        question: `Có thể liên hệ trước cho tuyến từ hoặc đến ${airportName} không?`,
        answer: `Có. Bạn có thể gửi hành trình dự kiến để ${SITE_NAME} ghi nhận nhu cầu, tư vấn loại xe và báo giá khi đủ dữ liệu vận hành cần thiết.`,
      },
      {
        question: "Vì sao một số tuyến chưa có giá cố định?",
        answer: "Các tuyến chưa có mức giá sân bay được xác minh sẽ hiển thị “Liên hệ báo giá”. Gocar VN không sao chép giá từ TP.HCM, Tân Sơn Nhất hoặc tuyến khác để làm giá Long Thành.",
      },
      {
        question: "Thông tin vận hành sân bay trên trang có phải lịch bay chính thức không?",
        answer: "Không. Trang này mô tả mức độ sẵn sàng dịch vụ xe của Gocar VN. Lịch khai thác sân bay và chuyến bay cần được kiểm tra từ cơ quan, hãng hàng không hoặc đơn vị khai thác có thẩm quyền.",
      },
    ];
  }

  return [
    {
      question: `Có xe từ ${airportName} đi các tỉnh không?`,
      answer: `${SITE_NAME} cung cấp xe riêng có tài xế cho các hành trình từ ${airportName} đến các địa phương đang có tuyến trong hệ thống.`,
    },
    {
      question: `Có thể đặt chiều từ tỉnh lên ${airportName} không?`,
      answer: `Có. Các tuyến hỗ trợ chiều đến sân bay được hiển thị trong mục “Đến ${airportName}”.`,
    },
    {
      question: "Nếu tuyến chưa có giá thì sao?",
      answer: "Các tuyến chưa có mức giá cố định sẽ hiển thị “Liên hệ báo giá”. Khách có thể gửi hành trình để được tư vấn.",
    },
    {
      question: "Tôi đi nhiều hành lý nên chọn xe nào?",
      answer: `Nên chọn loại xe dựa trên số người và lượng hành lý. Bạn có thể liên hệ ${SITE_NAME} để được tư vấn loại xe phù hợp.`,
    },
  ];
}

function RouteCard({ item }: { item: AirportHubRoute }) {
  const distance = item.route.distance;
  const time = item.route.time;
  const priceKicker = item.featuredPrice?.mode === "fixed" ? "Giá từ" : "Báo giá";

  return (
    <article className="airport-route-card">
      <div className="airport-route-path">
        <div>
          <span className="airport-route-label">Điểm đi</span>
          <strong>{item.from}</strong>
        </div>
        <ArrowDown aria-hidden="true" className="airport-route-arrow" />
        <div>
          <span className="airport-route-label">Điểm đến</span>
          <strong>{item.to}</strong>
        </div>
      </div>
      <div className="airport-route-meta">
        {distance ? <span><MapPin aria-hidden="true" /> {distance}</span> : null}
        {time ? <span><CheckCircle2 aria-hidden="true" /> {time}</span> : null}
      </div>
      <div className="airport-route-footer">
        <div>
          <span>{priceKicker}</span>
          <strong>{item.priceLabel}</strong>
        </div>
        <Button asChild>
          <Link href={item.href}>Xem tuyến <ArrowRight data-icon="inline-end" /></Link>
        </Button>
      </div>
    </article>
  );
}

function RouteList({ routes }: { routes: AirportHubRoute[] }) {
  if (routes.length === 0) {
    return (
      <div className="airport-empty">
        <MapPin aria-hidden="true" />
        <h3>Chưa có tuyến ở chiều này</h3>
        <p>Gọi hoặc nhắn Zalo để {SITE_NAME} tư vấn hành trình phù hợp với nhu cầu của bạn.</p>
      </div>
    );
  }

  return (
    <div className="airport-route-grid">
      {routes.map((item) => (
        <RouteCard key={`${item.route.slug}-${item.travelDirection}`} item={item} />
      ))}
    </div>
  );
}

export function AirportHubPage({ data }: { data: AirportHubData }) {
  const airportName = airportDisplayName(data.airport.name);
  const readiness = getAirportHubReadiness(data.airport.slug);
  const isPrelaunch = readiness.phase === "prelaunch";
  const faqs = buildAirportFaqs(airportName, readiness.phase);
  const routePairCount = new Set(data.routes.map((item) => item.route.slug)).size;
  const allProvinceLinks = data.routes
    .filter((item) => item.counterpart.provinceSlug)
    .map((item) => ({
      provinceSlug: item.counterpart.provinceSlug,
      name: item.route.region || item.counterpart.name,
    }))
    .filter((location, index, list) => list.findIndex((item) => item.provinceSlug === location.provinceSlug) === index);

  return (
    <main className="site-shell airport-hub-page">
      <JsonLd data={buildFaqPageSchema(faqs)} />
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel={isPrelaunch ? "Liên hệ tư vấn" : "Đặt xe ngay"}
        ctaHref={isPrelaunch ? "/lien-he" : "/#booking"}
      />
      <div className="airport-container">
        <nav className="airport-breadcrumb" aria-label="Đường dẫn trang">
          <Link href="/">Trang chủ</Link>
          <ArrowRight aria-hidden="true" />
          <Link href="/dich-vu/dua-don-san-bay">Đưa đón sân bay</Link>
          <ArrowRight aria-hidden="true" />
          <span aria-current="page">{airportName}</span>
        </nav>

        <section className="airport-hero">
          <div className="airport-hero-copy">
            <p className="airport-eyebrow"><PlaneLanding aria-hidden="true" /> {readiness.eyebrow}</p>
            {isPrelaunch ? <span className="airport-status-badge">PRE-LAUNCH · ĐANG CHUẨN BỊ</span> : null}
            <h1>{readiness.heroTitle(airportName)}</h1>
            <p className="airport-hero-lede">{readiness.heroDescription}</p>
            <div className="airport-actions">
              <Button size="lg" asChild>
                <a href="#airport-routes">Xem tuyến <ArrowRight data-icon="inline-end" /></a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={`tel:${SITE_HOTLINE_TEL}`}><Phone data-icon="inline-start" /> Gọi ngay</a>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <a href={`https://zalo.me/${SITE_CONTACT_PHONE_TEL.replace("+", "")}`}><MessageCircle data-icon="inline-start" /> Zalo</a>
              </Button>
            </div>
          </div>
          <div className="airport-hero-panel">
            <PlaneTakeoff aria-hidden="true" />
            <span>{isPrelaunch ? "Sẵn sàng theo dữ liệu xác minh" : "Hành trình chủ động"}</span>
            <strong>{readiness.routeCountLabel(routePairCount)}</strong>
            <p>{isPrelaunch ? "Liên hệ trước để kiểm tra lịch và điều kiện phục vụ thực tế." : "Đặt xe theo nhu cầu, không ghép khách."}</p>
          </div>
        </section>

        <section className="airport-routes-section" id="airport-routes">
          <div className="airport-section-heading">
            <div>
              <p className="airport-eyebrow">Danh sách tuyến</p>
              <h2>Chọn chiều hành trình</h2>
            </div>
            <p>{readiness.routesDescription}</p>
          </div>

          <nav className="airport-tabs" aria-label="Chuyển đến chiều hành trình">
            <a className="airport-tab is-active" href="#from-airport">
              <PlaneTakeoff aria-hidden="true" /> Từ {airportName}<span>{data.fromAirport.length}</span>
            </a>
            <a className="airport-tab" href="#to-airport">
              <PlaneLanding aria-hidden="true" /> Đến {airportName}<span>{data.toAirport.length}</span>
            </a>
          </nav>

          <div id="from-airport" className="airport-direction-block">
            <h3>Từ {airportName} đi tỉnh</h3>
            <RouteList routes={data.fromAirport} />
          </div>
          <div id="to-airport" className="airport-direction-block">
            <h3>Từ tỉnh đến {airportName}</h3>
            <RouteList routes={data.toAirport} />
          </div>
        </section>

        <section className="airport-service-callout">
          <div>
            <p className="airport-eyebrow">Dịch vụ {SITE_NAME}</p>
            <h2>{isPrelaunch ? "Chuẩn bị hành trình trước khi sân bay khai thác" : "Đưa đón sân bay nhẹ nhàng, đúng nhu cầu"}</h2>
            <p>
              {isPrelaunch
                ? "Gửi nhu cầu trước để được tư vấn loại xe, chiều hành trình và cách cập nhật báo giá khi dữ liệu vận hành đã đủ rõ."
                : "Xe có tài xế, hỗ trợ hành lý và linh hoạt cho cá nhân, gia đình hoặc nhóm công tác."}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dich-vu/dua-don-san-bay">Tìm hiểu dịch vụ <ArrowRight data-icon="inline-end" /></Link>
          </Button>
        </section>

        {allProvinceLinks.length > 0 ? (
          <section className="airport-province-links">
            <h2>Khám phá điểm đến</h2>
            <div>
              {allProvinceLinks.map((location) => (
                <Link key={location.provinceSlug} href={`/tuyen-duong/${location.provinceSlug}`}>
                  {location.name}<ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="airport-faq">
          <p className="airport-eyebrow">Câu hỏi thường gặp</p>
          <h2>Giải đáp nhanh về xe sân bay</h2>
          <div>
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="airport-contact-banner">
          <div>
            <p className="airport-eyebrow">Cần tư vấn riêng?</p>
            <h2>{isPrelaunch ? `Gửi hành trình dự kiến, ${SITE_NAME} tư vấn` : `Gửi hành trình, ${SITE_NAME} báo giá`}</h2>
            <p>Gọi {SITE_HOTLINE} hoặc nhắn Zalo để được hỗ trợ chọn xe và tuyến phù hợp.</p>
          </div>
          <div className="airport-actions">
            <Button asChild>
              <a href={`tel:${SITE_HOTLINE_TEL}`}><Phone data-icon="inline-start" /> Gọi {SITE_HOTLINE}</a>
            </Button>
            <Button variant="secondary" asChild>
              <a href={`https://zalo.me/${SITE_CONTACT_PHONE_TEL.replace("+", "")}`}><MessageCircle data-icon="inline-start" /> Nhắn Zalo</a>
            </Button>
          </div>
        </section>
      </div>

      <SiteFooter
        tagline="Những chuyến xe tử tế cho hành trình đáng nhớ."
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={[
          { title: "KHÁM PHÁ", links: [{ label: "Tuyến đường", href: "/tuyen-duong" }, { label: "Dịch vụ", href: "/dich-vu/dua-don-san-bay" }] },
          { title: "HỖ TRỢ", links: [{ label: "Liên hệ", href: "/lien-he" }] },
        ]}
        socialLinks={defaultSocialLinks}
        copyright="© Gocar VN"
        madeFor="Đồng hành mọi hành trình"
      />
    </main>
  );
}

export { buildAirportFaqs };
export type { AirportHubData };
