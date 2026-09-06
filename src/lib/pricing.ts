/**
 * Nguồn dữ liệu bảng giá dùng chung.
 *
 * Trang /bang-gia, trang chi tiết tuyến (/tuyen-duong/[slug]) và trang kết
 * hợp (/tuyen-duong/[slug]/[loai-xe]) đều nên đọc giá từ cùng một chỗ để
 * không bao giờ lệch nhau — đây là hàm đó.
 *
 * Giả định (điều chỉnh nếu khác với hàm fetchRoutes()/fetchVehicles() đã
 * viết ở ngày 12):
 * - REST base của CPT `route` là `/route`, của `vehicle` là `/vehicle`.
 * - Taxonomy `vehicle_type` có REST base mặc định trùng tên taxonomy.
 * - ACF field group của `route` đã bật "Show in REST API" (ngày 4) nên
 *   `pricing_by_vehicle` xuất hiện trong `acf.pricing_by_vehicle`, dạng
 *   mảng { vehicle_id, gia } (đã xác nhận ở các ngày trước).
 * - Mỗi `vehicle` gắn đúng 1 term `vehicle_type` (lấy phần tử đầu tiên
 *   nếu có nhiều).
 */

export interface PricingColumn {
  /** id của term trong taxonomy vehicle_type */
  id: number;
  slug: string;
  /** Tên loại xe hiển thị, vd "16-29 chỗ", "Limousine" */
  name: string;
}

export interface PricingRow {
  slug: string;
  title: string;
  /** Giá theo từng cột (key = PricingColumn.id). null = tuyến này không có loại xe đó */
  prices: Record<number, number | null>;
}

export interface PricingTableData {
  columns: PricingColumn[];
  rows: PricingRow[];
  /** Ngày cập nhật gần nhất, đã format vi-VN, lấy từ modified_date thật */
  lastUpdated: string;
}

const WP_API_BASE =
  process.env.NEXT_PUBLIC_WP_API_URL ??
  "https://xemiennam.datxesaigon.com/wp-json/wp/v2";

interface WPRoutePricingItem {
  vehicle_id: number;
  gia: number;
}

interface WPRoute {
  id: number;
  slug: string;
  title: { rendered: string };
  modified: string;
  acf?: { pricing_by_vehicle?: WPRoutePricingItem[] };
}

interface WPVehicle {
  id: number;
  vehicle_type?: number[];
}

interface WPTerm {
  id: number;
  slug: string;
  name: string;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const res = await fetch(`${WP_API_BASE}${path}${separator}page=${page}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // WP trả 400 khi vượt quá số trang thực tế — coi như đã hết dữ liệu
      if (res.status === 400 && page > 1) break;
      throw new Error(`Lỗi gọi WP REST API ${path} (trang ${page}): ${res.status}`);
    }

    const batch = (await res.json()) as T[];
    results.push(...batch);

    const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
    if (page >= totalPages || batch.length === 0) break;
    page += 1;
  }

  return results;
}

/** Sắp cột theo số chỗ tăng dần, loại không có số (vd "Limousine") xếp cuối */
function firstNumberOrInfinity(text: string): number {
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

export async function getPricingTable(): Promise<PricingTableData> {
  const [routes, vehicles, vehicleTypes] = await Promise.all([
    fetchAllPages<WPRoute>(
      "/route?per_page=100&_fields=id,slug,title,modified,acf"
    ),
    fetchAllPages<WPVehicle>("/vehicle?per_page=100&_fields=id,vehicle_type"),
    fetchAllPages<WPTerm>("/vehicle_type?per_page=100"),
  ]);

  const vehicleIdToTypeId = new Map<number, number>();
  vehicles.forEach((v) => {
    const typeId = v.vehicle_type?.[0];
    if (typeId != null) vehicleIdToTypeId.set(v.id, typeId);
  });

  const columns: PricingColumn[] = vehicleTypes
    .map((t) => ({ id: t.id, slug: t.slug, name: t.name }))
    .sort((a, b) => firstNumberOrInfinity(a.name) - firstNumberOrInfinity(b.name));

  const rows: PricingRow[] = routes.map((route) => {
    const prices: Record<number, number | null> = {};
    columns.forEach((col) => {
      prices[col.id] = null;
    });

    (route.acf?.pricing_by_vehicle ?? []).forEach((item) => {
      const typeId = vehicleIdToTypeId.get(item.vehicle_id);
      if (typeId == null) return;
      const current = prices[typeId];
      // Nếu 1 loại xe có nhiều xe cụ thể trùng cột, hiển thị giá thấp nhất
      prices[typeId] = current == null ? item.gia : Math.min(current, item.gia);
    });

    return { slug: route.slug, title: route.title.rendered, prices };
  });

  const latestModified = routes.reduce(
    (latest, route) => (route.modified > latest ? route.modified : latest),
    routes[0]?.modified ?? new Date().toISOString()
  );

  const lastUpdated = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(latestModified));

  return { columns, rows, lastUpdated };
}
