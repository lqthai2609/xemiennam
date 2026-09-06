import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * POST /api/revalidate (Ngày 20) — nhận webhook từ WordPress mỗi khi 1 bài
 * route/vehicle/dich_vu/promotion/testimonial/post được publish/lưu (snippet WPCode
 * "ISR — Webhook revalidate Next.js khi save_post", ID 16). Giúp trang cập nhật ngay thay
 * vì đợi hết REVALIDATE_SECONDS (mặc định 3600s/1h, xem lib/wp.ts).
 *
 * Xác thực bằng `secret` gửi trong BODY JSON (không phải header) — đúng cách snippet ID 16
 * đang gửi (wp_remote_post với body JSON, không có Authorization header). Giá trị secret
 * phải khớp với hằng số XMN_REVALIDATE_SECRET định nghĩa trong wp-config.php bên WordPress —
 * đặt cùng giá trị vào biến môi trường REVALIDATE_SECRET ở Vercel (xem .env.example). Snippet
 * ID 16 hiện đang dùng giá trị mặc định "THAY-SECRET-NAY" — nhớ đổi cả 2 bên trước khi coi
 * endpoint này production-ready, nếu không secret sẽ luôn khớp với giá trị mặc định công khai.
 */

const PATHS_BY_POST_TYPE: Record<string, (slug: string) => string[]> = {
  route: (slug) => ["/", "/tuyen-duong", `/tuyen-duong/${slug}`, "/bang-gia"],
  vehicle: (slug) => ["/", "/doi-xe", `/doi-xe/${slug}`, "/loai-xe", "/bang-gia"],
  dich_vu: (slug) => ["/dich-vu", `/dich-vu/${slug}`],
  promotion: () => ["/khuyen-mai"],
  testimonial: () => ["/danh-gia"],
  post: (slug) => ["/", "/blog", `/blog/${slug}`],
};

type RevalidatePayload = {
  secret?: string;
  post_type?: string;
  post_id?: number;
  slug?: string;
};

export async function POST(request: Request) {
  let body: RevalidatePayload | null = null;
  try {
    body = (await request.json()) as RevalidatePayload;
  } catch {
    return NextResponse.json({ revalidated: false, error: "Body không phải JSON hợp lệ." }, { status: 400 });
  }

  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (!expectedSecret) {
    console.error("[api/revalidate] Thiếu biến môi trường REVALIDATE_SECRET trên Next.js.");
    return NextResponse.json(
      { revalidated: false, error: "Server chưa cấu hình REVALIDATE_SECRET." },
      { status: 500 },
    );
  }
  if (!body?.secret || body.secret !== expectedSecret) {
    return NextResponse.json({ revalidated: false, error: "Secret không đúng." }, { status: 401 });
  }

  const postType = body.post_type ?? "";
  const slug = body.slug ?? "";
  const pathsForType = PATHS_BY_POST_TYPE[postType];
  // post_type lạ (chưa liệt kê ở trên) — chỉ làm mới trang chủ, an toàn hơn là bỏ qua hẳn.
  const paths = pathsForType ? pathsForType(slug) : ["/"];

  for (const path of paths) {
    revalidatePath(path);
  }

  // Trang kết hợp /tuyen-duong/[slug]/[loai-xe] (Ngày 14) không revalidate riêng được ở đây
  // vì không biết trước slug loại xe nào đang kết hợp với route này — revalidatePath kiểu
  // "layout" cần 1 layout.tsx thật đặt tại app/tuyen-duong/, hiện chưa có (chỉ có layout gốc
  // app/layout.tsx). Chấp nhận: trang kết hợp tự làm mới theo REVALIDATE_SECONDS mặc định (1h)
  // như bình thường — có thể bổ sung layout.tsx riêng cho /tuyen-duong sau nếu cần tức thời.

  return NextResponse.json({ revalidated: true, postType, slug, paths, now: Date.now() });
}

// Cho phép kiểm tra nhanh endpoint còn sống bằng cách mở URL trực tiếp trên trình duyệt —
// không xác thực gì (không trigger revalidate), chỉ để debug.
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Endpoint này nhận POST từ webhook WordPress (snippet WPCode ID 16), không dùng GET để revalidate.",
  });
}
