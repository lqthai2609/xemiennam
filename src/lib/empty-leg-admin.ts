import type { EmptyLegModel, EmptyLegReference, EmptyLegScope } from "@/types/empty-leg";

export type DispatchOption = { key: string; label: string; scope: EmptyLegScope; reference: EmptyLegReference };
export type DispatchConfirmation = { actor: number; at: string; revision: number; source_ref: string } | null;
export type DispatchEntry = { actor: number; at: string; action: "save" | "confirm"; reason: string; before: EmptyLegModel | null; after: EmptyLegModel; confirmation: DispatchConfirmation };
export type DispatchRecord = { id: number; model: EmptyLegModel; confirmation: DispatchConfirmation; history: DispatchEntry[]; assessment: { state: string; sellable: false; commercial_enabled: false } };

/** Explicit Vietnam wall time, independent of browser timezone; incomplete stays null. */
export function dispatchInstant(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Ngày giờ không hợp lệ.");
  const n = Date.parse(`${value}:00+07:00`);
  if (!Number.isFinite(n) || new Date(n + 7 * 3600000).toISOString().slice(0, 16) !== value) throw new Error("Ngày giờ không hợp lệ.");
  return new Date(n).toISOString().replace(".000Z", "Z");
}
export function dispatchWallTime(value: string | null): string {
  return value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : "";
}
export function dispatchMoney(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(n)) throw new Error("Giá phải là số nguyên dương.");
  return n;
}
export function dispatchEditable(record: DispatchRecord | null, canPublish: boolean): boolean {
  return !record || (!["completed", "cancelled"].includes(record.model.status) && (canPublish || record.model.approval.status !== "confirmed"));
}
