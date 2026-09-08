import Image from "next/image";

/**
 * Ảnh minh hoạ dùng chung cho mọi khối "vehicle-art" / "fleet-image" (Ngày 21b) — thay cho
 * icon đồ hoạ mặc định khi đã có ảnh thật (xe cụ thể hoặc loại xe). Luôn đặt bên trong 1 khối
 * cha đã có `position: relative; overflow: hidden` sẵn (đúng `.vehicle-art`/`.fleet-image`
 * hiện có) — ảnh tự phủ kín (object-fit: cover) + thêm lớp gradient tối phía dưới để chữ/nhãn
 * đặt đè lên ảnh vẫn đọc được, bất kể ảnh sáng hay tối màu.
 *
 * Dùng next/image với `fill`: domain ảnh CMS (xemiennam.datxesaigon.com) đã khai báo trong
 * next.config.ts (images.remotePatterns) nên không cần thẻ <img> thường nữa.
 */
export function MediaPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <>
      <Image src={src} alt={alt} fill className="media-photo-fill" />
      <span className="media-photo-scrim" aria-hidden="true" />
    </>
  );
}

export default MediaPhoto;
