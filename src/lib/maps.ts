/**
 * Google Maps embed cho trang chi tiết tuyến — /tuyen-duong/[slug] (Ngày 21).
 *
 * Từ Ngày 10/12, mapEmbedSrc tự sinh chỉ ghim 1 điểm (điểm đến) qua
 * maps.google.com/maps?q=...&output=embed — không sai, nhưng không thực sự cho thấy
 * "hành trình" như khối UI "CUNG ĐƯỜNG — Thấy trước hành trình" ở route-detail.tsx đang hứa.
 * Ngày 21 nâng lên dạng chỉ đường thật (điểm đi → điểm đến) bằng cách thêm saddr/daddr vào
 * cùng endpoint — vẫn KHÔNG cần API key (khác Google Maps Embed API chính thức, cần key +
 * bật billing), vì dùng chung dạng URL maps.google.com cũ đã dùng ổn định từ đầu dự án.
 *
 * Không thay cho wp.meta.google_maps_embed — nơi gọi (lib/api/routes.ts) vẫn ưu tiên giá trị
 * ACF thật đó trước (nhập tay toạ độ điểm đón/trả chính xác ở Ngày 24), hàm này chỉ là
 * fallback tự sinh khi field đó còn trống.
 */
export function buildRouteMapEmbedSrc(from: string | undefined | null, to: string | undefined | null): string {
  const safeFrom = from?.trim();
  const safeTo = to?.trim();

  if (safeFrom && safeTo) {
    return `https://maps.google.com/maps?saddr=${encodeURIComponent(safeFrom)}&daddr=${encodeURIComponent(safeTo)}&output=embed`;
  }

  // Thiếu 1 trong 2 đầu tuyến (dữ liệu diem_di/diem_den chưa nhập đủ) — ghim tạm điểm còn lại,
  // còn hơn nhúng 1 khung bản đồ trống hoàn toàn.
  const fallbackPoint = safeTo || safeFrom || "Việt Nam";
  return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackPoint)}&output=embed`;
}
