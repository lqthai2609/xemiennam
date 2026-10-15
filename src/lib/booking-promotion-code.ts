import { z } from "zod";

/** Capture a supplied code for manual verification; never evaluate a discount. */
export const promotionCodeInput = z.string().trim().max(64, "Mã khuyến mãi tối đa 64 ký tự.")
  .refine((code) => !/[\u0000-\u001f\u007f<>]/u.test(code), "Mã khuyến mãi chứa ký tự không hợp lệ.");
