"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MAX_INTERMEDIATE_STOPS,
  MAX_STOP_ADDRESS_LENGTH,
  MAX_WAITING_MINUTES,
  type IntermediateStopInput,
} from "@/lib/booking-stops";

type MultiStopFieldsProps = {
  stops: IntermediateStopInput[];
  onChange: (stops: IntermediateStopInput[]) => void;
  errors?: Array<{ address?: { message?: string }; waitingMinutes?: { message?: string } }>;
};

export function MultiStopFields({ stops, onChange, errors = [] }: MultiStopFieldsProps) {
  function updateStop(index: number, patch: Partial<IntermediateStopInput>) {
    onChange(stops.map((stop, stopIndex) => (stopIndex === index ? { ...stop, ...patch } : stop)));
  }

  function moveStop(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-foreground">Điểm dừng trung gian</legend>
      <p className="m-0 text-xs leading-5 text-muted-foreground">
        Không bắt buộc. Tối đa {MAX_INTERMEDIATE_STOPS} điểm; thứ tự bên dưới là thứ tự hành trình.
      </p>

      {stops.map((stop, index) => (
        <div key={index} className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_9rem_auto]">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
            Điểm dừng {index + 1}
            <input
              value={stop.address}
              onChange={(event) => updateStop(index, { address: event.target.value })}
              maxLength={MAX_STOP_ADDRESS_LENGTH}
              aria-invalid={!!errors[index]?.address}
              className="form-control"
              placeholder="Địa chỉ hoặc điểm hẹn..."
            />
            {errors[index]?.address?.message && (
              <span className="text-sm text-destructive">{errors[index]?.address?.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
            Chờ (phút)
            <input
              value={String(stop.waitingMinutes)}
              onChange={(event) => updateStop(index, { waitingMinutes: Number(event.target.value) })}
              type="number"
              min={0}
              max={MAX_WAITING_MINUTES}
              step={1}
              inputMode="numeric"
              aria-invalid={!!errors[index]?.waitingMinutes}
              className="form-control"
            />
            {errors[index]?.waitingMinutes?.message && (
              <span className="text-sm text-destructive">{errors[index]?.waitingMinutes?.message}</span>
            )}
          </label>
          <div className="flex items-end gap-1">
            <Button type="button" size="icon" variant="outline" disabled={index === 0} onClick={() => moveStop(index, -1)} aria-label={`Đưa điểm dừng ${index + 1} lên`}>
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button type="button" size="icon" variant="outline" disabled={index === stops.length - 1} onClick={() => moveStop(index, 1)} aria-label={`Đưa điểm dừng ${index + 1} xuống`}>
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button type="button" size="icon" variant="outline" onClick={() => onChange(stops.filter((_, stopIndex) => stopIndex !== index))} aria-label={`Xóa điểm dừng ${index + 1}`}>
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}

      {stops.length < MAX_INTERMEDIATE_STOPS && (
        <Button type="button" variant="outline" className="w-full sm:w-fit" onClick={() => onChange([...stops, { address: "", waitingMinutes: 0 }])}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Thêm điểm dừng
        </Button>
      )}
    </fieldset>
  );
}
