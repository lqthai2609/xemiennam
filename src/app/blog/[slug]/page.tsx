import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogCard } from "@/components/blog-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, defaultSocialLinks } from "@/components/site-footer";
import { UnifiedHero } from "@/components/unified-hero";
import { getVehicleCategory } from "@/data/vehicle-categories";
import { navItems } from "@/data/nav";
import { fetchPostBySlug, fetchPosts, fetchRelatedPosts } from "@/lib/api/blog";
import { fetchLocationsV2, type LocationV2 } from "@/lib/api/locations";
import { fetchRoutes } from "@/lib/api/routes";
import { airportDisplayName, airportHubHref } from "@/lib/airport-seo";
import { buildFaqPageSchema } from "@/lib/schema";
import { SITE_HOTLINE, SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import { decodeHtmlEntities } from "@/lib/wp";
import type { BlogPost } from "@/types/blog";
import type { Route } from "@/types/route";
import { JsonLd } from "@/components/json-ld";

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
      label: decodeHtmlEntities(rawLabel),
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
    ? {
        title: post.rankMathTitle || `${post.title} | Blog ${SITE_NAME}`,
        description: post.rankMathDescription || post.excerpt,
      }
    : { title: `Không tìm thấy bài viết | ${SITE_NAME}` };
}

const footerLinkGroups = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Tuyến đường", href: "/tuyen-duong" },
      { label: "Khuyến mãi", href: "/khuyen-mai" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Câu hỏi thường gặp", href: "#" },
      { label: "Liên hệ", href: "/lien-he" },
    ],
  },
];

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

  return (
    <main className="site-shell">
      {faqItems.length > 0 && (
        <JsonLd data={buildFaqPageSchema(faqItems.map((f) => ({ question: f.question, answer: f.answer })))} />
      )}
      <SiteHeader
        menuItems={navItems}
        hotline={SITE_HOTLINE}
        hotlineHref={`tel:${SITE_HOTLINE_TEL}`}
        ctaLabel="Đặt xe ngay"
        ctaHref="/#booking"
      />

      <UnifiedHero eyebrow={post.category} title={post.title} description={post.excerpt} backgroundImage={post.featuredImageUrl || "/images/services/city-tour.png"} backHref="/blog" backLabel="Tất cả bài viết" />

      <section className="section-wrap blog-detail-content">
        <article className="blog-detail-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        {faqItems.length > 0 && (
          <section className="blog-detail-faq">
            <p className="section-label">CÂU HỎI THƯỜNG GẶP</p>
            <div className="blog-faq-list">
              {faqItems.map((item, index) => (
                <details className="blog-faq-item" key={`${item.question}-${index}`}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
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
      </section>

      {relatedPosts.length > 0 && (
        <section className="related-section section-wrap post-related-posts">
          <div className="section-heading">
            <div>
              <p className="section-label">BÀI VIẾT LIÊN QUAN</p>
              <h2>Đọc tiếp theo chủ đề.</h2>
            </div>
            <Link className="text-link" href="/blog">
              Xem tất cả bài viết <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="route-grid blog-grid">
            {relatedPosts.map((related) => <BlogCard post={related} key={related.id} />)}
          </div>
        </section>
      )}

      <SiteFooter
        tagline={
          <>
            Đi đâu cũng có {SITE_NAME}.
            <br />
            Kết nối những hành trình tử tế.
          </>
        }
        phone={SITE_HOTLINE}
        phoneHref={`tel:${SITE_HOTLINE_TEL}`}
        linkGroups={footerLinkGroups}
        socialLinks={defaultSocialLinks}
        copyright={`© 2026 ${SITE_NAME}`}
        madeFor="Made for the road."
        brandName={SITE_NAME}
      />
    </main>
  );
}
