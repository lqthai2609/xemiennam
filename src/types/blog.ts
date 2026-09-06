export interface BlogPost {
  id: string;
  /** URL slug — khớp slug field của WordPress khi nối API thật (Ngày 17, giống quy ước Ngày 12). */
  slug: string;
  title: string;
  /** Tóm tắt plain-text (đã stripHtml từ excerpt/content) — dùng cho thẻ danh sách + meta description. */
  excerpt: string;
  /**
   * Nội dung ĐẦY ĐỦ dạng HTML thô từ `content.rendered` của WordPress — KHÔNG stripHtml
   * như vehicle/service, vì bài blog thật (Ngày 25–26) sẽ có internal-link, đoạn văn,
   * heading... mà plain text sẽ làm mất hết định dạng lẫn liên kết nội bộ. Render bằng
   * dangerouslySetInnerHTML trong PostBody (an toàn vì nội dung do chính Mr Dúi biên tập
   * trong wp-admin, không phải input công khai).
   */
  contentHtml: string;
  /** Tên category lấy từ taxonomy `blog_category` (Ngày 3) — rỗng cho tới khi gắn term thật. */
  category: string;
  publishedDate: string;
  /** Dùng cho nhãn "Cập nhật lần cuối" khi khác ngày đăng — freshness thật, không hardcode (mục 5, kiến trúc kỹ thuật). */
  modifiedDate: string;
  /** URL ảnh đại diện lấy qua `_embed` → `wp:featuredmedia` — chưa có ảnh thật cho tới khi nhập nội dung (Ngày 25–26). */
  featuredImageUrl?: string;
}

export interface BlogFilterState {
  category: string;
}

export const emptyBlogFilters: BlogFilterState = { category: "" };

export function hasActiveBlogFilters(filters: BlogFilterState) {
  return Boolean(filters.category);
}
