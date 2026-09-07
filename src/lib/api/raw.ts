import { wpFetch } from "@/lib/wp";

/**
 * Kiểu dữ liệu THÔ đúng như WP REST API trả về cho CPT `route`/`vehicle`
 * (rest_base trùng post type — xem WPCode snippet ID 11, Ngày 3).
 * Field meta khớp đúng snippet Ngày 4 (ID 12) + snippet bổ sung Ngày 12 (ID 20).
 *
 * `_embed=1` được thêm vào mọi query list/single bên dưới để WordPress trả kèm
 * `_embedded["wp:term"]` (taxonomy terms: vehicle_type/province) — tránh phải
 * gọi thêm request riêng cho từng taxonomy.
 */

export type WPTerm = { id: number; taxonomy: string; slug: string; name: string };

export type WPRoute = {
  id: number;
  slug: string;
  title: { rendered: string };
  meta: {
    diem_di?: string;
    diem_den?: string;
    khoang_cach_km?: number;
    thoi_gian_di_chuyen?: string;
    diem_don?: string;
    diem_tra?: string;
    google_maps_embed?: string;
    pricing_by_vehicle?: { vehicle_id: number | string; gia: number | string }[];
    // Bổ sung Ngày 12 (snippet ID 20) — cần kích hoạt snippet trong wp-admin trước khi có dữ liệu thật.
    tom_tat_ngan?: string;
    diem_nhan_hero?: string;
    khung_gio_hay_chon?: string[];
    luu_y_tuyen?: string[];
  };
  _embedded?: { "wp:term"?: WPTerm[][] };
};

export type WPVehicle = {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  meta: {
    so_cho?: number;
    hinh_thuc_lai?: "tu_lai" | "co_tai_xe" | "ca_hai";
    gia_tham_khao?: number;
    // Đã đối chiếu trực tiếp với snippet WPCode ID 12 (Ngày 4) đang chạy thật trên site —
    // cả 2 field này lưu dạng MẢNG (list_text/list_int), KHÔNG phải chuỗi cần tách dấu phẩy
    // như bản trước Ngày 21c từng giả định (bug, chưa lộ ra vì WP chưa có dữ liệu thật).
    tien_ich?: string[];
    /** Mảng ID media (số), không phải URL — phải resolve qua /media?include=... để lấy source_url, xem lib/api/vehicles.ts. */
    gallery_anh?: number[];
  };
  _embedded?: { "wp:term"?: WPTerm[][] };
};

/** Lấy tên term đầu tiên của 1 taxonomy cụ thể trong _embedded["wp:term"] (mảng lồng mảng theo từng taxonomy). */
export function embeddedTermName(
  embedded: { "wp:term"?: WPTerm[][] } | undefined,
  taxonomy: string,
): string | undefined {
  return embedded?.["wp:term"]?.flat().find((t) => t?.taxonomy === taxonomy)?.name;
}

/**
 * Lấy TẤT CẢ term của 1 taxonomy cụ thể (khác embeddedTermName ở trên chỉ lấy 1).
 * Cần cho `dich_vu` (Ngày 13): 1 dịch vụ có thể gắn nhiều hơn 1 term `vehicle_type`
 * (vd "Xe cưới" áp dụng cả "4–7 chỗ" lẫn "Limousine").
 */
export function embeddedTerms(
  embedded: { "wp:term"?: WPTerm[][] } | undefined,
  taxonomy: string,
): WPTerm[] {
  return embedded?.["wp:term"]?.flat().filter((t) => t?.taxonomy === taxonomy) ?? [];
}

/**
 * Lấy URL ảnh đại diện (featured image) từ `_embedded["wp:featuredmedia"]` — chỉ có khi
 * bài viết có gắn ảnh đại diện VÀ query có `_embed=1`. Nếu bài chưa gắn ảnh, WordPress bỏ
 * hẳn key này (không phải mảng rỗng), và nếu ID ảnh không hợp lệ, phần tử đầu có `code` lỗi
 * thay vì `source_url` — cả 2 trường hợp trả về undefined để component tự có fallback (vd
 * `.blog-thumb` màu nền + icon, giống bản demo tĩnh ban đầu).
 */
export function embeddedFeaturedImage(
  embedded: { "wp:featuredmedia"?: { source_url?: string; code?: string }[] } | undefined,
): string | undefined {
  const media = embedded?.["wp:featuredmedia"]?.[0];
  if (!media || media.code) return undefined;
  return media.source_url;
}

/**
 * Kiểu dữ liệu THÔ cho blog — dùng post type mặc định của WordPress (`post`, rest_base
 * "posts"), KHÔNG phải custom post type riêng (Ngày 17). Taxonomy `blog_category` (đăng ký
 * Ngày 3) lấy qua `embeddedTermName(wp._embedded, "blog_category")`, giống cách route lấy
 * `province`. `excerpt`/`content` là field mặc định của WP, không cần snippet field riêng.
 */
export type WPPost = {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    "wp:term"?: WPTerm[][];
    "wp:featuredmedia"?: { source_url?: string; code?: string }[];
  };
};

/**
 * Kiểu dữ liệu THÔ cho CPT `dich_vu` (Ngày 13). Field meta khớp đúng snippet Ngày 4
 * (ID 12): `mo_ta_nhu_cau` (textarea), `loai_xe_phu_hop` (select_multi_post → target
 * `vehicle`, trả về mảng ID bài `vehicle` liên quan), `luu_y_dich_vu` (textarea).
 * Taxonomy `vehicle_type` gắn trực tiếp vào `dich_vu` (đăng ký Ngày 3) — lấy qua
 * `_embedded["wp:term"]` giống route/vehicle, dùng `embeddedTerms()` vì có thể nhiều term.
 */
export type WPService = {
  id: number;
  slug: string;
  title: { rendered: string };
  content?: { rendered: string };
  meta: {
    mo_ta_nhu_cau?: string;
    loai_xe_phu_hop?: (number | string)[];
    luu_y_dich_vu?: string;
  };
  _embedded?: { "wp:term"?: WPTerm[][] };
};

/**
 * Kiểu dữ liệu THÔ cho CPT `promotion` (Ngày 18). Field meta khớp đúng snippet Ngày 4
 * (ID 12): `loai_giam_gia` (select: phan_tram/so_tien), `gia_tri_giam` (number), `ngay_bat_dau`/
 * `ngay_ket_thuc` (date, chuỗi yyyy-mm-dd), `ap_dung_route`/`ap_dung_vehicle` (select_multi_post
 * → target route/vehicle, trả về mảng ID bài liên quan — rỗng nghĩa là áp dụng mọi tuyến/loại
 * xe). Không gắn taxonomy nào (xem snippet ID 11) nên không cần `_embed`. title.rendered = tên
 * chương trình, content.rendered = mô tả ngắn.
 */
export type WPPromotion = {
  id: number;
  slug: string;
  title: { rendered: string };
  content?: { rendered: string };
  meta: {
    loai_giam_gia?: "phan_tram" | "so_tien";
    gia_tri_giam?: number;
    ngay_bat_dau?: string;
    ngay_ket_thuc?: string;
    ap_dung_route?: (number | string)[];
    ap_dung_vehicle?: (number | string)[];
  };
};

/**
 * Kiểu dữ liệu THÔ cho CPT `testimonial` (Ngày 18). Field meta khớp đúng snippet Ngày 4
 * (ID 12): `so_sao` (number 1-5), `route_lien_quan`/`vehicle_lien_quan` (select_single_post →
 * target route/vehicle, trả về ĐÚNG 1 ID bài liên quan — quan hệ thật, không phải text tự do,
 * đúng nguyên tắc mục 3 kiến trúc kỹ thuật). title.rendered = tên khách, content.rendered =
 * nội dung đánh giá. `date` là field WP mặc định (post_date) — không cần meta riêng.
 */
export type WPTestimonial = {
  id: number;
  slug: string;
  title: { rendered: string };
  content?: { rendered: string };
  date?: string;
  meta: {
    so_sao?: number;
    route_lien_quan?: number | string;
    vehicle_lien_quan?: number | string;
  };
};

const LIST_QUERY = "per_page=100&_embed=1";

export async function fetchRawRoutes(): Promise<WPRoute[]> {
  return (await wpFetch<WPRoute[]>(`/route?${LIST_QUERY}`)) ?? [];
}

export async function fetchRawRouteBySlug(slug: string): Promise<WPRoute | null> {
  const list = await wpFetch<WPRoute[]>(`/route?slug=${encodeURIComponent(slug)}&_embed=1`);
  return list?.[0] ?? null;
}

export async function fetchRawVehicles(): Promise<WPVehicle[]> {
  return (await wpFetch<WPVehicle[]>(`/vehicle?${LIST_QUERY}`)) ?? [];
}

export async function fetchRawVehicleBySlug(slug: string): Promise<WPVehicle | null> {
  const list = await wpFetch<WPVehicle[]>(`/vehicle?slug=${encodeURIComponent(slug)}&_embed=1`);
  return list?.[0] ?? null;
}

export async function fetchRawServices(): Promise<WPService[]> {
  return (await wpFetch<WPService[]>(`/dich_vu?${LIST_QUERY}`)) ?? [];
}

export async function fetchRawServiceBySlug(slug: string): Promise<WPService | null> {
  const list = await wpFetch<WPService[]>(`/dich_vu?slug=${encodeURIComponent(slug)}&_embed=1`);
  return list?.[0] ?? null;
}

export async function fetchRawPromotions(): Promise<WPPromotion[]> {
  return (await wpFetch<WPPromotion[]>(`/promotion?${LIST_QUERY}`)) ?? [];
}

export async function fetchRawTestimonials(): Promise<WPTestimonial[]> {
  return (await wpFetch<WPTestimonial[]>(`/testimonial?${LIST_QUERY}`)) ?? [];
}

// rest_base của post type mặc định là "posts" (số nhiều), khác các CPT còn lại (rest_base
// trùng slug post type) — xem ghi chú ở WPPost phía trên.
export async function fetchRawPosts(): Promise<WPPost[]> {
  return (await wpFetch<WPPost[]>(`/posts?${LIST_QUERY}`)) ?? [];
}

export async function fetchRawPostBySlug(slug: string): Promise<WPPost | null> {
  const list = await wpFetch<WPPost[]>(`/posts?slug=${encodeURIComponent(slug)}&_embed=1`);
  return list?.[0] ?? null;
}