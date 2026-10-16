import type { PromotionTuple } from "@/lib/api/promotion-model";
export type CouponQuote = { code: string; quoteKey: string; basePrice: number; before: number; discount: number; after: number };
export type CouponReceipt = { coupon_id: number; code: string; revision: number; quote_key: string };
export type CouponConfig = {
  code: string; name: string; status: "draft" | "active" | "paused";
  kind: "fixed_discount" | "percent_discount"; value: number; cap_vnd: number | null;
  minimum_vnd: number; limit: number; start_date: string; end_date: string;
  departure_start: string | null; departure_end: string | null; scopes: PromotionTuple[];
};
export type CouponRecord = { id: number; revision: number; config: CouponConfig; used: number; held: number;
  history: { actor: number; at: string; revision: number; before: CouponConfig | null; after: CouponConfig }[] };
export type CouponOption = { key: string; scope: PromotionTuple; label: string };
