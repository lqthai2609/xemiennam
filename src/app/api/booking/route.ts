import { NextResponse } from "next/server";
import { z } from "zod";

import { embeddedTermName, fetchRawRoutes, fetchRawVehicles } from "@/lib/api/raw";
import { wpAuthedFetch } from "@/lib/api/wp-auth";

/**
 * POST /api/booking (Ngày 20) — nhận dữ liệu từ ContactBookingForm (Ngày 19, hiện dùng ở
 * /lien-he), tạo 1 bài `booking_request` bên WordPress qua REST API có JWT
 * (wpAuthedFetch, lib/api/wp-auth.ts).
 *
 * Field CPT `booking_request` khớp đúng snippet WPCode "Ngày 4 - Field cho 6 CPT" (ID 12):
 * post_title = họ tên khách; meta.so_dien_thoai/ngay_di/ghi_chu/trang_thai_booking là
 * text/date/textarea/select — ghi thẳng giá trị người dùng nhập. Riêng meta.tuyen_quan_tam
 * và meta.loai_xe_dat là QUAN HỆ THẬT (integer, ID bài `route`/`vehicle`) — nhưng form chỉ
 * có nhãn dạng chữ ("TP.HCM – Vũng Tàu", "16–29 chỗ"), nên phải dò khớp sang ID thật bằng
 * fetchRawRoutes()/fetchRawVehicles() (raw.ts). Cố tình KHÔNG dùng fetchRoutes()/fetchVehicles()
 * (lib/api/routes.ts, vehicles.ts) vì 2 hàm đó có fallback mock khi CMS chưa có dữ liệu thật
 * (useMockFallback) — id mock không phải ID bài thật bên WordPress, gán nhầm sẽ liên kết lead
 * vào sai bài khi Ngày 24 nhập liệu thật xong.
 *
 * Nếu chưa dò được ID thật (trước Ngày 24 CMS còn trống, hoặc khách chọn "Tuyến khác"),
 * KHÔNG bỏ lead — vẫn tạo bài với quan hệ để trống (0), và gộp tên tuyến/loại xe dạng chữ
 * khách đã chọn vào đầu ghi_chu, để không mất thông tin khi nhân viên gọi lại xác nhận.
 */

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

// Mirror đúng bookingSchema ở contact-booking-form.tsx — validate lại phía server, không
// tin tưởng dữ liệu client gửi lên dù đã qua Zod ở form.
const bookingRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Thiếu họ tên."),
  phone: z.string().trim().regex(phoneRegex, "Số điện thoại không đúng định dạng Việt Nam."),
  route: z.string().trim().min(1, "Thiếu tuyến quan tâm."),
  vehicleType: z.string().trim().min(1, "Thiếu loại xe."),
  departureDate: z.string().trim().optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
});

const OTHER_ROUTE_LABEL = "Tuyến khác";

async function resolveRouteId(routeLabel: string): Promise<number | null> {
  if (routeLabel === OTHER_ROUTE_LABEL) return null;
  const routes = await fetchRawRoutes();
  const match = routes.find((r) => `${r.meta.diem_di ?? ""} – ${r.meta.diem_den ?? ""}` === routeLabel);
  return match?.id ?? null;
}

async function resolveVehicleId(vehicleTypeLabel: string): Promise<number | null> {
  const vehicles = await fetchRawVehicles();
  const match = vehicles.find((v) => embeddedTermName(v._embedded, "vehicle_type") === vehicleTypeLabel);
  return match?.id ?? null;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Nội dung gửi lên không phải JSON hợp lệ." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Thông tin đặt xe chưa hợp lệ.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const [routeId, vehicleId] = await Promise.all([
    resolveRouteId(data.route),
    resolveVehicleId(data.vehicleType),
  ]);

  // Chưa dò được ID thật (CMS chưa có dữ liệu, hoặc khách chọn "Tuyến khác") — giữ lại
  // thông tin dạng chữ trong ghi_chu thay vì làm mất, xem ghi chú đầu file.
  const noteParts: string[] = [];
  if (routeId === null) noteParts.push(`Tuyến quan tâm (chưa khớp CMS): ${data.route}`);
  if (vehicleId === null) noteParts.push(`Loại xe (chưa khớp CMS): ${data.vehicleType}`);
  if (data.note) noteParts.push(data.note);

  const result = await wpAuthedFetch<{ id: number }>("/booking_request", {
    method: "POST",
    body: {
      title: data.fullName,
      status: "publish",
      meta: {
        so_dien_thoai: data.phone,
        tuyen_quan_tam: routeId ?? 0,
        loai_xe_dat: vehicleId ?? 0,
        ngay_di: data.departureDate,
        ghi_chu: noteParts.join(" | "),
        trang_thai_booking: "moi",
      },
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json({ ok: true, id: result.data.id });
}
