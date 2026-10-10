import type { PromotionTuple } from "@/lib/api/promotion-model";
import type { PromotionReason } from "@/lib/api/promotion-evaluator";

/** Public projection only. All amounts and eligibility are resolved on the server. */
export interface PromotionPriceView {
  tuple: PromotionTuple;
  purpose: "base_catalog" | "trip_estimate";
  mode: "fixed" | "contact" | "disabled";
  state: PromotionReason;
  message?: string;
  originalAmount?: number;
  amount?: number;
  offerEligible: boolean;
  claim?: {
    layer?: "base_price" | "estimated_total" | "surcharge";
    layerLabel?: string;
    before?: number;
    after?: number;
    discountAmount: number;
    benefit?: { title: string; rule: string };
    conditions: string[];
    startDate: string;
    endDate: string;
    validFrom: string;
    validThrough: string;
    expiresAt: string;
  };
}
