"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { BookOpen, Search, ArrowRight, RotateCcw } from "lucide-react";
import { BlogCard, type BlogSummary } from "@/components/blog-card";
import { BlogContactBanner, BlogDiscovery } from "@/components/blog-design-shared";
import { formatPublicLocationText } from "@/lib/public-location-label";

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
}

export function BlogPageClient({ posts }: { posts: BlogSummary[] }) {
  const [category, setCategory] = useState("");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const categories = useMemo(() => [...new Set(posts.map((post) => post.category).filter(Boolean))], [posts]);
  const filtered = useMemo(() => {
    const search = normalizeSearch(query);
    return posts.filter((post) => (!category || post.category === category) && (!search || normalizeSearch(formatPublicLocationText(`${post.title} ${post.excerpt} ${post.category}`)).includes(search)));
  }, [category, posts, query]);
  const isFiltering = Boolean(category || query);
  const featured = !isFiltering ? filtered[0] : undefined;
  const latest = featured ? filtered.slice(1) : filtered;
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setQuery(input.trim()); }
  function clear() { setCategory(""); setInput(""); setQuery(""); }

  return <>
    <section className="journal-hero journal-archive-hero">
      <div className="journal-hero-image"><Image src="/images/contact-coast-hero.webp" alt="" fill sizes="100vw" preload /></div>
      <div className="journal-container journal-hero-inner"><div className="journal-hero-copy"><p className="journal-eyebrow">CẨM NANG HÀNH TRÌNH</p><h1>Cẩm nang<br />trước khi lên xe</h1><p>Kinh nghiệm chọn xe, chuẩn bị chuyến đi và khám phá điểm đến.</p></div></div>
    </section>
    <div className="journal-container journal-archive-content">
      <section className="journal-filters" aria-label="Tìm và lọc bài viết">
        <form className="journal-search" onSubmit={search} role="search"><Search aria-hidden="true" /><label className="sr-only" htmlFor="journal-search-input">Tìm bài viết theo chủ đề hoặc điểm đến</label><input id="journal-search-input" type="search" placeholder="Tìm bài viết theo chủ đề hoặc điểm đến..." value={input} onChange={(event) => { setInput(event.target.value); if (!event.target.value) setQuery(""); }} /><button className="journal-button" type="submit">Tìm kiếm <ArrowRight size={18} aria-hidden="true" /></button></form>
        <div className="journal-filter-chips"><button type="button" aria-pressed={!category} className={!category ? "is-active" : ""} onClick={() => setCategory("")}>Tất cả</button>{categories.map((cat) => <button type="button" key={cat} aria-pressed={category === cat} className={category === cat ? "is-active" : ""} onClick={() => setCategory(cat)}><BookOpen size={18} aria-hidden="true" />{cat}</button>)}{isFiltering && <button type="button" onClick={clear}><RotateCcw size={16} aria-hidden="true" />Xóa lọc</button>}</div>
      </section>
      {featured && <section className="journal-featured"><h2 className="journal-heading">Bài viết nổi bật</h2><BlogCard post={featured} editorial featured /></section>}
      <section className="journal-latest"><h2 className="journal-heading">{isFiltering ? "Kết quả tìm kiếm" : "Bài viết mới"}</h2>{isFiltering && <p className="journal-result-count" role="status">{filtered.length} bài viết phù hợp{query ? ` với “${query}”` : ""}</p>}{latest.length > 0 ? <div className="journal-post-grid">{latest.map((post) => <BlogCard key={post.id} post={post} editorial />)}</div> : <div className="journal-empty"><BookOpen size={32} aria-hidden="true" /><h3>{isFiltering ? "Không tìm thấy bài viết phù hợp" : "Chưa có bài viết mới"}</h3><p>{isFiltering ? "Thử từ khóa khác hoặc xem tất cả bài viết." : "Các bài viết mới sẽ được cập nhật tại đây."}</p>{isFiltering && <button className="journal-button" type="button" onClick={clear}>Xem tất cả bài viết</button>}</div>}</section>
      <BlogDiscovery /><BlogContactBanner />
    </div>
  </>;
}
