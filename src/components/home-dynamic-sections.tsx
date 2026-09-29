import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchPosts } from "@/lib/api/blog";
import { fetchDestinationCards } from "@/lib/api/diem-den";
import { fetchRoutes } from "@/lib/api/routes";
import { routeHref, type Route } from "@/types/route";
import { getPublicLocationLabel } from "@/lib/public-location-label";
import { canSuggestRelatedRoute } from "@/lib/content-readiness";

const featuredDestinations = ["Vũng Tàu", "Hồ Tràm", "Long Hải"];
const destinationImages: Record<string, string> = {
  "Vũng Tàu": "/images/destinations/ba-ria-vung-tau.webp",
  "Hồ Tràm": "/images/destinations/phan-thiet.webp",
  "Long Hải": "/images/destinations/ba-ria-vung-tau.webp",
};

function pickFeaturedRoutes(routes: Route[]) {
  const used = new Set<string>();
  return featuredDestinations.flatMap((name) => {
    const route = routes.find((item) => !used.has(item.slug) && canSuggestRelatedRoute(item) && item.to.toLowerCase().includes(name.toLowerCase()));
    if (!route) return [];
    used.add(route.slug);
    return [route];
  });
}

function Heading({ title, description, href, link }: { title: string; description: string; href: string; link: string }) {
  return <div className="home-section-heading"><div><h2>{title}</h2><p>{description}</p></div><Link href={href}>{link} <ArrowRight size={17} /></Link></div>;
}

export async function HomeFeaturedRoutes() {
  const featuredRoutes = pickFeaturedRoutes(await fetchRoutes());
  if (!featuredRoutes.length) return null;
  return <section className="home-routes home-container" id="routes">
    <Heading title="Tuyến được quan tâm" description="Những tuyến phổ biến, phù hợp cho nhiều nhu cầu di chuyển." href="/tuyen-duong" link="Xem tất cả tuyến" />
    <div className="home-route-grid">{featuredRoutes.map((route) => {
      const name = featuredDestinations.find((destination) => route.to.toLowerCase().includes(destination.toLowerCase())) || "Vũng Tàu";
      const fixed = route.pricingV2?.outbound.featured?.mode === "fixed";
      return <article className="home-route-card" key={route.slug}>
        <Link className="home-route-image" href={routeHref(route)} tabIndex={-1} aria-hidden="true"><Image src={destinationImages[name]} alt="" fill sizes="(max-width: 700px) 42vw, 33vw" /></Link>
        <div className="home-route-details"><h3>{getPublicLocationLabel(route.from)} đi {getPublicLocationLabel(route.to)}</h3><span>{fixed ? "Giá chỉ" : "Giá chuyến"}</span><div className="home-route-bottom"><p><strong>{fixed ? route.price : "Liên hệ báo giá"}</strong>{fixed && <small>Một chiều / chuyến</small>}</p><Link href={routeHref(route)}>Xem tuyến <ArrowRight size={17} /></Link></div></div>
      </article>;
    })}</div>
  </section>;
}

export async function HomeFeaturedDestinations() {
  const destinations = await fetchDestinationCards();
  const preferredDestinations = ["ba-ria-vung-tau", "tay-ninh", "can-tho"];
  const featuredHubs = preferredDestinations.flatMap((slug) => destinations.find((destination) => destination.slug === slug) || []);
  if (!featuredHubs.length) return null;
  return <section className="home-destinations home-container" id="destinations">
    <Heading title="Khám phá điểm đến" description="Gợi ý những điểm đến nổi bật với nhiều tuyến đường phù hợp." href="/diem-den" link="Xem tất cả điểm đến" />
    <div className="home-destination-grid">{featuredHubs.map((destination) => <Link className="home-destination-card" href={`/tuyen-duong/${destination.slug}`} key={destination.slug}>
      <div className="home-destination-image">{destination.imageUrl && <Image src={destination.imageUrl} alt={`Phong cảnh ${getPublicLocationLabel(destination)}`} fill sizes="(max-width: 700px) 78vw, 33vw" />}</div>
      <div><strong>{getPublicLocationLabel(destination)}</strong><span>Xem các tuyến <ArrowRight size={16} /></span></div>
    </Link>)}</div>
  </section>;
}

export async function HomeFeaturedBlog() {
  const posts = await fetchPosts();
  const featuredPost = posts.find((post) => post.slug === "xe-4-cho-hay-7-cho-di-san-bay-lien-tinh") || posts[0];
  if (!featuredPost) return null;
  return <section className="home-blog home-container" id="blog"><Heading title="Bài viết nổi bật" description="Thông tin hữu ích trước khi lên đường." href="/blog" link="Xem tất cả bài viết" />
    <Link className="home-blog-card" href={`/blog/${featuredPost.slug}`}>
      <div className="home-blog-image">{featuredPost.featuredImageUrl && <Image src={featuredPost.featuredImageUrl} alt="" fill sizes="(max-width: 700px) 35vw, 220px" />}</div>
      <strong>{featuredPost.title}</strong><span>Đọc bài <ArrowRight size={16} /></span>
    </Link>
  </section>;
}
