import { ArrowRight, Clock3, Milestone, Star } from "lucide-react";
import Link from "next/link";
import { BlogCard } from "@/components/blog-card";
import { DestinationCardTile } from "@/components/destination-card-tile";
import { ServiceCard } from "@/components/service-card";
import { fetchPosts } from "@/lib/api/blog";
import { fetchDestinationCards } from "@/lib/api/diem-den";
import { fetchRoutes } from "@/lib/api/routes";
import { fetchServices } from "@/lib/api/services";
import { fetchTestimonials } from "@/lib/api/testimonials";
import { routeHref, type Route } from "@/types/route";

const featuredDestinationNames = ["Vũng Tàu", "Hồ Tràm", "Cần Thơ", "Mũi Né", "Phan Thiết", "Đà Lạt"];

function pickFeaturedRoutes(routes: Route[]) {
  const used = new Set<string>();
  return featuredDestinationNames.flatMap((destination) => {
    const match = routes.find(
      (route) => !used.has(route.slug) && route.to.toLowerCase().includes(destination.toLowerCase()),
    );
    if (!match) return [];
    used.add(match.slug);
    return [match];
  });
}

function Heading({ label, title, href, link }: { label: string; title: string; href?: string; link?: string }) {
  return <div className="section-heading"><div><p className="section-label">{label}</p><h2>{title}</h2></div>{href && link && <Link className="text-link" href={href}>{link} <ArrowRight size={17} /></Link>}</div>;
}

function RouteCard({ route }: { route: Route }) {
  return <article className="route-ticket"><div className="rt-price"><span>Giá từ</span><b>{route.price}</b></div><div className="rt-body"><div className="rt-route"><span>{route.from}</span><ArrowRight size={16} /><span>{route.to}</span></div><div className="rt-meta"><span><Clock3 size={13} /> {route.time}</span><span><Milestone size={13} /> {route.distance}</span><span className="rt-vehicles">{route.vehicleTypes.join(" · ")}</span></div></div><div className="rt-cta"><Link href={routeHref(route)}>Xem chi tiết <ArrowRight size={14} /></Link></div></article>;
}

/** CMS-backed, below-the-fold content is streamed independently so it cannot delay the LCP hero. */
export async function HomeDynamicSections() {
  const [routes, posts, services, testimonials, destinations] = await Promise.all([
    fetchRoutes(), fetchPosts(), fetchServices(), fetchTestimonials(), fetchDestinationCards(),
  ]);
  const featuredRoutes = pickFeaturedRoutes(routes);
  const featuredTestimonials = testimonials.slice(0, 6);
  const averageRating = testimonials.length ? testimonials.reduce((sum, item) => sum + item.rating, 0) / testimonials.length : 0;

  return <>
    {destinations.length > 0 && <section className="destinations-section section-wrap" id="destinations"><Heading label="ĐIỂM ĐẾN PHỔ BIẾN" title="Đi đâu hôm nay?" href="/diem-den" link="Xem tất cả điểm đến" /><div className="destination-grid">{destinations.slice(0, 6).map((destination) => <DestinationCardTile destination={destination} key={destination.slug} />)}</div></section>}
    <section className="routes-section section-wrap" id="routes"><Heading label="TUYẾN NỔI BẬT" title="Được đặt nhiều nhất." href="/tuyen-duong" link="Xem tất cả tuyến" /><div className="route-list">{featuredRoutes.map((route) => <RouteCard key={route.slug} route={route} />)}</div></section>
    <section className="home-services-section section-wrap" id="services"><Heading label="DỊCH VỤ" title="Dịch vụ theo nhu cầu của bạn." href="/dich-vu" link="Xem tất cả dịch vụ" /><div className="service-card-grid">{services.map((service) => <ServiceCard key={service.slug} service={service} />)}</div></section>
    <section className="stories-section section-wrap" id="stories"><div className="section-heading"><div><p className="section-label">HÀNH KHÁCH NÓI GÌ</p><h2>Chuyện trên những cung đường.</h2></div><div className="rating"><Star size={18} fill="currentColor" /><strong>{averageRating.toFixed(1)}</strong><span> / 5.0</span></div></div><div className="home-testimonial-grid">{featuredTestimonials.map((item) => <article className="combo-testimonial-card" key={item.id}><div className="combo-testimonial-stars">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={14} fill={index < item.rating ? "currentColor" : "none"} />)}</div><p>&ldquo;{item.quote}&rdquo;</p><div className="combo-testimonial-who"><span className="combo-testimonial-avatar">{item.initials}</span><b>{item.name}</b></div></article>)}</div></section>
    {posts.length > 0 && <section className="blog-section section-wrap" id="blog"><Heading label="BLOG" title="Cẩm nang trước khi lên xe." href="/blog" link="Xem tất cả bài viết" /><div className="route-grid blog-grid">{posts.slice(0, 3).map((post) => <BlogCard key={post.slug} post={post} />)}</div></section>}
  </>;
}
