/**
 * Ảnh placeholder tạm cho ảnh xe/loại xe (Ngày 21b) — dùng placehold.co (dịch vụ tạo ảnh
 * khối màu + chữ, KHÔNG phải ảnh thật, không dính bản quyền của ai) thay vì hotlink ảnh xe
 * thật tìm được trên mạng — tránh rủi ro dùng ảnh có bản quyền của hãng xe/trang stock khác
 * mà không được phép, kể cả khi chỉ dùng tạm thời để test giao diện.
 *
 * Màu nền/chữ khớp đúng 4 màu thương hiệu đã dùng xuyên suốt site (`vehicle.color`/
 * `category.color`: sand/gold/navy/orange) — placeholder vẫn nhất quán màu sắc thay vì xám
 * mặc định.
 *
 * BẮT BUỘC thay bằng ảnh thật (ảnh anh Dúi tự chụp xe, hoặc ảnh stock đã mua bản quyền) trước
 * khi đưa site lên domain thật — xem ghi chú trong data/vehicles.ts và data/vehicle-categories.ts.
 */
const PLACEHOLDER_COLORS: Record<string, { bg: string; fg: string }> = {
  sand: { bg: "FBF5EC", fg: "1B1F27" },
  gold: { bg: "F5A623", fg: "1B1F27" },
  navy: { bg: "0F1626", fg: "F5A623" },
  orange: { bg: "E8560C", fg: "FFFFFF" },
};

export function buildPlaceholderImage(
  color: "sand" | "gold" | "navy" | "orange",
  label: string,
  size: { width: number; height: number } = { width: 640, height: 480 },
): string {
  const { bg, fg } = PLACEHOLDER_COLORS[color] ?? PLACEHOLDER_COLORS.sand;
  const text = encodeURIComponent(label);
  return `https://placehold.co/${size.width}x${size.height}/${bg}/${fg}?text=${text}&font=roboto`;
}
