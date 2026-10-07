import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { BlogPost } from "@/types/blog";
import { blogIllustration } from "@/lib/blog-presentation";
import { formatVNDate } from "@/lib/wp";
import { formatPublicLocationText } from "@/lib/public-location-label";

export type BlogSummary = Omit<BlogPost, "contentHtml">;

export function BlogCard({ post, editorial = false, featured = false }: { post: BlogSummary; editorial?: boolean; featured?: boolean }) {
  const image = post.featuredImageUrl || (editorial ? blogIllustration(post) : undefined);
  return (
    <Link href={`/blog/${post.slug}`} className={`blog-card${editorial ? " journal-card" : ""}${featured ? " journal-featured-card" : ""}`}>
      <div className="blog-thumb">
        {image ? (
          <Image src={image} alt="" fill sizes={editorial ? "(max-width: 700px) 100vw, 50vw" : "(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"} />
        ) : <BookOpen size={32} aria-hidden="true" />}
        {editorial && post.category && <span className="journal-card-category">{post.category}</span>}
      </div>
      <div className="blog-body">
        {!editorial && <span className="blog-cat">{post.category}</span>}
        {editorial && <time className="blog-date" dateTime={post.publishedDate}>{formatVNDate(post.publishedDate)}</time>}
        <h3>{formatPublicLocationText(post.title)}</h3>
        {editorial && <p className="journal-card-excerpt">{formatPublicLocationText(post.excerpt)}</p>}
        {editorial ? <span className={`journal-read-link${featured ? " journal-button" : ""}`}>Đọc bài viết <ArrowRight size={17} aria-hidden="true" /></span> : <time className="blog-date" dateTime={post.publishedDate}>{formatVNDate(post.publishedDate)}</time>}
      </div>
    </Link>
  );
}
