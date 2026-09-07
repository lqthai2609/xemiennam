import type { JsonLdObject } from "@/lib/schema";

/**
 * Render 1 object JSON-LD thành thẻ <script type="application/ld+json"> (Ngày 23).
 * dangerouslySetInnerHTML an toàn ở đây vì `data` luôn do chính component cha dựng từ
 * dữ liệu đã fetch (không phải input người dùng cuối tự nhập trực tiếp vào HTML).
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
