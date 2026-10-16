import { z } from "zod";

/** Normalize a code only. Eligibility and money are always server-owned. */
export const promotionCodeInput = z.string().trim().max(64, "Mã khuyến mãi tối đa 64 ký tự.")
  .refine((code) => !/[\u0000-\u001f\u007f<>]/u.test(code), "Mã khuyến mãi chứa ký tự không hợp lệ.");
