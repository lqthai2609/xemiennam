import type { BlogOutlineItem } from "@/lib/blog-outline";

export function BlogTableOfContents({ items }: { items: BlogOutlineItem[] }) {
  if (!items.length) return null;
  const links = <ol>{items.map((item) => <li key={item.id} className={item.level === 3 ? "journal-toc-subheading" : ""}><a href={`#${encodeURIComponent(item.id)}`}>{item.title}</a></li>)}</ol>;
  return <aside className="journal-toc"><nav className="journal-toc-desktop" aria-label="Mục lục bài viết"><h2>Trong bài viết</h2>{links}</nav><details className="journal-toc-mobile"><summary>Trong bài viết</summary><nav aria-label="Mục lục bài viết">{links}</nav></details></aside>;
}
