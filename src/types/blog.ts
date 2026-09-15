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
   * dangerouslySetInnerHTML trong PostBody (an toàn vì nội dung do chính biên tập viên
   * quản trị trong wp-admin, không phải input công khai).
   */
  contentHtml: string;
  /** Tên category lấy từ taxonomy `blog_category` — dùng cho phân loại nội dung, không thay relation Province/Vehicle/Airport. */
  category: string;
  /** Day 24: structured Blog ↔ Province relation từ taxonomy `province`. */
  provinceSlugs: string[];
  /** Day 24: structured Blog ↔ Vehicle relation từ taxonomy `vehicle_type`. */
  vehicleTypeSlugs: string[];
  /** Day 24: structured Blog ↔ Airport relation bằng Location V2 ID có type=airport. */
  airportLocationIds: number[];
  publishedDate: string;
  /** Dùng cho nhãn "Cập nhật lần cuối" khi khác ngày đăng — freshness thật, không hardcode. */
  modifiedDate: string;
  /** URL ảnh đại diện lấy qua `_embed` → `wp:featuredmedia`. */
  featuredImageUrl?: string;
  /** Rank Math SEO title/description — generateMetadata() ưu tiên 2 field này. */
  rankMathTitle?: string;
  rankMathDescription?: string;
  /**
   * Câu hỏi-đáp cho bài blog dạng FAQ — dựng JSON-LD FAQPage khi mảng không rỗng.
   * Field `faq_items` là chuỗi JSON do WordPress REST contract expose.
   */
  faqItems?: { question: string; answer: string }[];
}

export interface BlogFilterState {
  category: string;
}

export const emptyBlogFilters: BlogFilterState = { category: "" };

export function hasActiveBlogFilters(filters: BlogFilterState) {
  return Boolean(filters.category);
}
