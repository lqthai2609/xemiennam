import { SITE_AREA_SERVED, SITE_DESCRIPTION, SITE_HOTLINE_TEL, SITE_NAME, SITE_URL } from "@/lib/site-config";

/**
 * Dựng object JSON-LD (mục 5, kiến trúc kỹ thuật) — component <JsonLd /> (json-ld.tsx)
 * chỉ lo phần render <script>, còn shape dữ liệu từng loại schema nằm hết ở đây để tái
 * dùng được giữa nhiều trang mà không lặp code (vd Service schema dùng chung cho cả
 * /tuyen-duong/[slug], /loai-xe/[slug], /dich-vu/[slug], trang kết hợp).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonLdObject = Record<string, any>;

/** LocalBusiness — trang chủ (mục 5). */
export function buildLocalBusinessSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    telephone: SITE_HOTLINE_TEL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "TP. Hồ Chí Minh",
      addressCountry: "VN",
    },
    areaServed: SITE_AREA_SERVED,
    priceRange: "$$",
  };
}

/**
 * Service — dùng chung cho /tuyen-duong/[slug], /loai-xe/[slug], /dich-vu/[slug] và trang
 * kết hợp /tuyen-duong/[slug]/[loai-xe] (mục 5 + mục 9.3, kiến trúc kỹ thuật). `areaServed`
 * nhận qua tham số vì mỗi trang tuyến chỉ phục vụ đúng điểm đến của tuyến đó, không phải
 * toàn bộ khu vực như LocalBusiness ở trang chủ.
 */
export function buildServiceSchema({
  name,
  description,
  url,
  areaServed,
}: {
  name: string;
  description: string;
  url: string;
  areaServed?: string | string[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Cho thuê xe nguyên chiếc",
    name,
    description,
    url: `${SITE_URL}${url}`,
    provider: {
      "@type": "LocalBusiness",
      name: SITE_NAME,
      telephone: SITE_HOTLINE_TEL,
      url: SITE_URL,
    },
    areaServed: areaServed ?? SITE_AREA_SERVED,
  };
}

/**
 * FAQPage — bài blog dạng hỏi-đáp (mục 5). `items` rỗng thì KHÔNG gọi hàm này ở nơi gọi
 * (kiểm tra `post.faqItems.length > 0` trước) — schema.org không cho FAQPage có mainEntity rỗng.
 */
export function buildFaqPageSchema(items: { question: string; answer: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * Review/AggregateRating — trang /danh-gia (mục 5). `reviews` giới hạn số lượng đưa vào
 * JSON-LD (khuyến nghị chung của Google: không cần nhồi hết hàng trăm review vào 1 script,
 * chỉ cần đại diện) — trang vẫn hiển thị đầy đủ review ở UI, JSON-LD chỉ là dữ liệu có cấu trúc.
 */
export function buildAggregateRatingSchema({
  ratingValue,
  reviewCount,
  reviews,
}: {
  ratingValue: number;
  reviewCount: number;
  reviews: { author: string; ratingValue: number; reviewBody: string; datePublished?: string }[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    url: SITE_URL,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(ratingValue.toFixed(1)),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 20).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.ratingValue, bestRating: 5, worstRating: 1 },
      reviewBody: r.reviewBody,
      ...(r.datePublished ? { datePublished: r.datePublished } : {}),
    })),
  };
}
