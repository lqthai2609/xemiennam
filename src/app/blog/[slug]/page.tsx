import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogCard } from "@/components/blog-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Image from "next/image";
import { BlogContactBanner } from "@/components/blog-design-shared";
import { BlogTableOfContents } from "@/components/blog-table-of-contents";
import { blogIllustration } from "@/lib/blog-presentation";
import { buildBlogOutline } from "@/lib/blog-outline";
import { formatVNDate } from "@/lib/wp";
import "@/components/blog-redesign.css";
import { getVehicleCategory } from "@/data/vehicle-categories";
import { navItems } from "@/data/nav";
import { fetchPostBySlug, fetchPosts, fetchRelatedPosts } from "@/lib/api/blog";
import { fetchLocationsV2, type LocationV2 } from "@/lib/api/locations";
import { fetchRoutes } from "@/lib/api/routes";
import { airportDisplayName, airportHubHref } from "@/lib/airport-seo";
import { buildPageMetadata } from "@/lib/metadata";
import { buildFaqPageSchema } from "@/lib/schema";
import { SITE_HOTLINE, SITE_HOTLINE_TEL } from "@/lib/site-config";
import { decodeHtmlEntities } from "@/lib/wp";
import type { BlogPost } from "@/types/blog";
import type { Route } from "@/types/route";
import { JsonLd } from "@/components/json-ld";
import { formatPublicLocationText, getPublicLocationLabel } from "@/lib/public-location-label";

export type Props = { params: Promise<{ slug: string }> };

type RelatedHubLink = {
  href: string;
  label: string;
  relation: "Sân bay" | "Điểm đến" | "Loại xe";
};

function buildRelatedHubLinks(post: BlogPost, routes: Route[], locations: LocationV2[]): RelatedHubLink[] {
  const links: RelatedHubLink[] = [];
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const regionNameBySlug = new Map(routes.map((route) => [route.regionSlug, route.region]));
  const exactLocationNameBySlug = new Map(locations.map((location) => [location.slug, location.name]));

  for (const airportLocationId of post.airportLocationIds) {
    const airport = locationById.get(airportLocationId);
    if (!airport || airport.type !== "airport") continue;
    links.push({
      href: airportHubHref(airport.slug),
      label: airportDisplayName(airport.name),
      relation: "Sân bay",
    });
  }

  for (const provinceSlug of post.provinceSlugs) {
    const rawLabel = exactLocationNameBySlug.get(provinceSlug) || regionNameBySlug.get(provinceSlug);
    if (!rawLabel) continue;
    links.push({
      href: `/tuyen-duong/${provinceSlug}`,
      label: getPublicLocationLabel(decodeHtmlEntities(rawLabel)),
      relation: "Điểm đến",
    });
  }

  for (const vehicleSlug of post.vehicleTypeSlugs) {
    const category = getVehicleCategory(vehicleSlug);
    if (!category) continue;
    links.push({
      href: `/loai-xe/${vehicleSlug}`,
      label: category.label,
      relation: "Loại xe",
    });
  }

  return Array.from(new Map(links.map((link) => [link.href, link])).values());
}

export async function generateStaticParams() {
  const posts = await fetchPosts();
  return posts.map(({ slug }) => ({ slug }));
}

/** Ngày 23 — ưu tiên rankMathTitle/rankMathDescription trước khi tự soạn (mục 5, kiến trúc kỹ thuật). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  return post
    ? buildPageMetadata({
        title: formatPublicLocationText(post.rankMathTitle || `${post.title} | Blog`),
        description: formatPublicLocationText(post.rankMathDescription || post.excerpt),
        path: `/blog/${post.slug}`,
        openGraphType: "article",
      })
    : buildPageMetadata({
        title: "Không tìm thấy bài viết",
        description: "Bài viết này không tồn tại hoặc hiện không khả dụng.",
        noIndex: true,
      });
}

/**
 * Day 25 — internal graph dùng structured relations từ Day 24.
 * Related Blog được xếp hạng bằng fetchRelatedPosts(); Blog → Hub chỉ resolve từ
 * Airport Location V2, province taxonomy và vehicle taxonomy, không text matching.
 */
export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (!post) notFound();

  const [relatedPosts, routes, locations] = await Promise.all([
    fetchRelatedPosts(slug, 3),
    fetchRoutes(),
    fetchLocationsV2(),
  ]);
  const relatedHubLinks = buildRelatedHubLinks(post, routes, locations);
  const faqItems = post.faqItems ?? [];
  const outline = buildBlogOutline(formatPublicLocationText(post.contentHtml));
  const wasUpdated = post.modifiedDate && post.modifiedDate !== post.publishedDate;

  return (
    <main className="site-shell blog-redesign">
      {faqItems.length > 0 && (
        <JsonLd data={buildFaqPageSchema(faqItems.map((f) => ({ question: formatPublicLocationText(f.question), answer: formatPublicLocationText(f.answer) })))} />
      )}
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="/#booking"
      />

      <section className="journal-hero journal-detail-hero">
        <div className="journal-hero-image"><Image src={blogIllustration(post)} alt={post.featuredImageUrl ? formatPublicLocationText(post.title) : ""} fill sizes="100vw" preload /></div>
        <div className="journal-container journal-hero-inner"><div className="journal-hero-copy">
          <nav className="journal-breadcrumb" aria-label="Đường dẫn"><Link href="/blog">Blog</Link>{post.category && <><span aria-hidden="true">/</span><span>{post.category}</span></>}</nav>
          <p className="journal-eyebrow">{post.category || "CẨM NANG HÀNH TRÌNH"}</p>
          <h1>{formatPublicLocationText(post.title)}</h1>
          {post.excerpt && <p>{formatPublicLocationText(post.excerpt)}</p>}
          <div className="journal-post-meta"><time dateTime={post.publishedDate}>{formatVNDate(post.publishedDate)}</time>{wasUpdated && <span>Cập nhật: <time dateTime={post.modifiedDate}>{formatVNDate(post.modifiedDate)}</time></span>}</div>
        </div></div>
      </section>

      <div className="journal-container journal-detail-grid">
        <BlogTableOfContents items={outline.items} />
        <div className="journal-article-column">
        <article className="blog-detail-body journal-article" dangerouslySetInnerHTML={{ __html: outline.html }} />

        {faqItems.length > 0 && (
          <section className="blog-detail-faq">
            <p className="section-label">CÂU HỎI THƯỜNG GẶP</p>
            <div className="blog-faq-list">
              {faqItems.map((item, index) => (
                <details className="blog-faq-item" key={`${item.question}-${index}`}>
                  <summary>{formatPublicLocationText(item.question)}</summary>
                  <p>{formatPublicLocationText(item.answer)}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {relatedHubLinks.length > 0 && (
          <aside className="blog-detail-related" aria-labelledby="blog-related-hubs-heading">
            <p className="section-label" id="blog-related-hubs-heading">KHÁM PHÁ LIÊN QUAN</p>
            <div className="blog-related-links">
              {relatedHubLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-link">
                  {link.relation}: {link.label} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </aside>
        )}
        </div>
      </div>
      <div className="journal-container"><BlogContactBanner detail /></div>

      {relatedPosts.length > 0 && (
        <section className="journal-container journal-related-posts">
          <div className="section-heading">
            <div>
              <h2 className="journal-heading">Bài viết liên quan</h2>
            </div>
            <Link className="text-link" href="/blog">
              Xem tất cả bài viết <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="journal-post-grid">
            {relatedPosts.map((related) => <BlogCard post={related} key={related.id} editorial />)}
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
