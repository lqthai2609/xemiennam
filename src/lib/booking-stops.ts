import { z } from "zod";

export const MAX_INTERMEDIATE_STOPS = 3;
export const MAX_STOP_ADDRESS_LENGTH = 240;
export const MAX_WAITING_MINUTES = 1_440;

export const intermediateStopInputSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ điểm dừng.")
    .max(MAX_STOP_ADDRESS_LENGTH, `Địa chỉ điểm dừng tối đa ${MAX_STOP_ADDRESS_LENGTH} ký tự.`),
  waitingMinutes: z
    .number()
    .int("Thời gian chờ phải là số phút nguyên.")
    .min(0, "Thời gian chờ không được âm.")
    .max(MAX_WAITING_MINUTES, "Thời gian chờ tối đa 1.440 phút."),
});

export const intermediateStopsInputSchema = z
  .array(intermediateStopInputSchema)
  .max(MAX_INTERMEDIATE_STOPS, `Tối đa ${MAX_INTERMEDIATE_STOPS} điểm dừng trung gian.`);

export type IntermediateStopInput = z.input<typeof intermediateStopInputSchema>;
export type IntermediateStop = z.output<typeof intermediateStopInputSchema>;

export function formatIntermediateStops(stops: IntermediateStop[]): string {
  if (!stops.length) return "Không có";
  return stops
    .map((stop, index) => `${index + 1}. ${stop.address} (chờ ${stop.waitingMinutes} phút)`)
    .join("; ");
}
