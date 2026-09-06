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
    tien_ich?: string;
    gallery_anh?: string;
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
