import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { BlogPost } from "@/types/blog";
import { formatVNDate } from "@/lib/wp";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="blog-card"
    >
      <div
        className="blog-thumb"
        style={post.coverImage ? { backgroundImage: `url(${post.coverImage})` } : undefined}
      >
        {/* Chưa có ảnh đại diện (mock hoặc bài WP chưa gắn ảnh) → giữ nền gradient + icon, giống bản demo tĩnh ban đầu. */}
        {!post.coverImage && <BookOpen size={26} />}
      </div>
      <div className="blog-body">
        <span className="blog-cat">{post.category}</span>
        <h3>{post.title}</h3>
        <time className="blog-date" dateTime={post.publishedDate}>
          {formatVNDate(post.publishedDate)}
        </time>
      </div>
    </Link>
  );
}