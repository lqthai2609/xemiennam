import { z } from "zod";

const count = z.number().int().min(0).max(100);
const dimensions = z.tuple([z.number().int().min(1).max(300), z.number().int().min(1).max(300), z.number().int().min(1).max(300)]).nullable();
export const vehicleSelectorRequestSchema = z.object({
  passengers: z.number().int().min(1).max(100),
  service_level: z.enum(["standard", "business", "premium"]).nullable().optional(),
  luggage: z.object({
    cabin_bags: count,
    checked_bags: count,
    cabin_max_cm: dimensions,
    checked_max_cm: dimensions,
    total_luggage_kg: z.number().int().min(1).max(5000).nullable(),
  }).strict().superRefine((bags, context) => {
    if ((bags.cabin_bags === 0) !== (bags.cabin_max_cm === null) ||
        (bags.checked_bags === 0) !== (bags.checked_max_cm === null) ||
        ((bags.cabin_bags === 0 && bags.checked_bags === 0) !== (bags.total_luggage_kg === null))) {
      context.addIssue({ code: "custom", message: "Thiếu giới hạn hành lý." });
    }
  }).nullable().optional(),
}).strict();
