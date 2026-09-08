export interface DestinationCard {
  slug: string;
  name: string;
  routeCount: number;
  blurb: string;
  imageUrl?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Hub điểm đến / tỉnh (Ngày 25) — nội dung biên tập cho `/tuyen-duong/[tinh]`, khác `Route`
 * (1 tuyến cụ thể bên trong hub). Slug LUÔN trùng slug term `province` tương ứng (xem ghi chú
 * ở WPDiemDen trong lib/api/raw.ts) — không tự sinh slug riêng ở đây.
 */
export interface DiemDen {
  id: string;
  slug: string;
  title: string;
  contentHtml: string;
  featuredImageUrl?: string;
  faqItems: FaqItem[];
  modifiedDate?: string;
  rankMathTitle?: string;
  rankMathDescription?: string;
}
