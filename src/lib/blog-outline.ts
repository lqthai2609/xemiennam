import { stripHtml } from "@/lib/wp";

export type BlogOutlineItem = { id: string; title: string; level: number };

/** Giữ HTML và anchor từ CMS; chỉ thêm id cho heading chưa có anchor. */
export function buildBlogOutline(contentHtml: string): { html: string; items: BlogOutlineItem[] } {
  const items: BlogOutlineItem[] = [];
  const usedIds = new Set(Array.from(contentHtml.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi), (match) => match[2]));
  let index = 0;
  const html = contentHtml.replace(/<h([23])(\s[^>]*|)>([\s\S]*?)<\/h\1>/gi, (heading, level: string, attributes: string, body: string) => {
    const title = stripHtml(body);
    if (!title) return heading;
    const existingId = attributes.match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
    let id = existingId;
    if (!id) {
      do { id = `blog-section-${++index}`; } while (usedIds.has(id));
      usedIds.add(id);
    }
    items.push({ id, title, level: Number(level) });
    return existingId ? heading : `<h${level}${attributes} id="${id}">${body}</h${level}>`;
  });
  return { html, items };
}
