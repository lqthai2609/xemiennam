/**
 * Ảnh minh hoạ dùng chung cho mọi khối "vehicle-art" / "fleet-image" (Ngày 21b) — thay cho
 * icon đồ hoạ mặc định khi đã có ảnh thật (xe cụ thể hoặc loại xe). Luôn đặt bên trong 1 khối
 * cha đã có `position: relative; overflow: hidden` sẵn (đúng `.vehicle-art`/`.fleet-image`
 * hiện có) — ảnh tự phủ kín (object-fit: cover) + thêm lớp gradient tối phía dưới để chữ/nhãn
 * đặt đè lên ảnh vẫn đọc được, bất kể ảnh sáng hay tối màu.
 *
 * Dùng thẻ <img> thường, KHÔNG dùng next/image: ảnh hiện tại đến từ placeholder tạm (chưa cố
 * định domain), còn ảnh thật sau này sẽ nằm trên domain WordPress media
 * (xemiennam.datxesaigon.com) — khi nào domain ảnh thật ổn định, có thể cân nhắc chuyển sang
 * next/image (khai báo remotePatterns trong next.config) để tối ưu tải trang, nhưng không bắt
 * buộc phải làm ngay.
 */
export function MediaPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- xem ghi chú domain ảnh chưa cố định ở trên. */}
      <img src={src} alt={alt} className="media-photo-fill" />
      <span className="media-photo-scrim" aria-hidden="true" />
    </>
  );
}

export default MediaPhoto;
