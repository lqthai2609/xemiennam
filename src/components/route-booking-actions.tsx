"use client";

import { AirportPickupAdvice } from "@/components/airport-pickup-advice";
import { validateFlightFields } from "@/lib/airport-timing";
import { VehicleSelector } from "@/components/vehicle-selector";
import { RequiredMark } from "@/components/required-mark";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZaloIcon } from "@/components/zalo-icon";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, LoaderCircle, Phone, Plane, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getZaloChatLink } from "@/lib/zalo";
import { trackBookingLead } from "@/lib/analytics";
import { fetchBookingWithIdempotency } from "@/lib/booking-submit";
import { readCreatedLead } from "@/lib/lead-response";
import { SITE_HOTLINE_TEL, SITE_NAME } from "@/lib/site-config";
import type { RoutePricingDirectionKey, RoutePricingMode } from "@/types/route";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export type AirportBookingContext = "pickup_from_airport" | "dropoff_at_airport";

function buildQuickBookingSchema(airportContext?: AirportBookingContext) {
  return z
    .object({
      fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
      phone: z.string().trim().regex(phoneRegex, "Số điện thoại chưa đúng định dạng Việt Nam."),
      pickupAddress: z
        .string()
        .trim()
        .max(240, "Điểm đón tối đa 240 ký tự."),
      dropoffAddress: z
        .string()
        .trim()
        .max(240, "Điểm trả tối đa 240 ký tự."),
      pickupNote: z.string().trim().max(300, "Lưu ý điểm đón tối đa 300 ký tự.").optional(),
      departureAt: z.string().optional(),
      flightNumber: z.string().trim().max(40, "Số hiệu chuyến bay tối đa 40 ký tự.").optional(),
      landingAt: z.string().optional(),
      airportTerminal: z.string().trim().max(80, "Thông tin nhà ga tối đa 80 ký tự.").optional(),
      flightKind: z.enum(["", "domestic", "international"]).optional(),
      flightAt: z.string().optional(),
      airportArrivalAt: z.string().optional(),
      passengerCount: z.string().trim().optional(),
      luggageCount: z.string().trim().optional(),
      requestNameplate: z.boolean().optional(),
      nameplateName: z.string().trim().max(80, "Tên trên bảng tối đa 80 ký tự.").optional(),
    })
    .superRefine((data, context) => {
      if (airportContext !== "pickup_from_airport" && !data.pickupAddress) {
        context.addIssue({ code: "custom", path: ["pickupAddress"], message: "Vui lòng nhập điểm đón cụ thể." });
      }
      if (airportContext !== "dropoff_at_airport" && !data.dropoffAddress) {
        context.addIssue({ code: "custom", path: ["dropoffAddress"], message: "Vui lòng nhập điểm trả cụ thể." });
      }
      if (!airportContext) return;
      const issues = validateFlightFields({ movement: airportContext === "pickup_from_airport" ? "arrival" : "departure", flight_number: data.flightNumber || null, flight_at: (airportContext === "pickup_from_airport" ? data.landingAt : data.flightAt) || null, airport_arrival_at: data.airportArrivalAt || null }, Date.now());
      for (const issue of issues) context.addIssue({ code: "custom", path: [issue.field === "flight_number" ? "flightNumber" : issue.field === "airport_arrival_at" ? "airportArrivalAt" : airportContext === "pickup_from_airport" ? "landingAt" : "flightAt"], message: issue.message });

      const passengerCount = Number(data.passengerCount);
      if (!data.passengerCount || !Number.isInteger(passengerCount) || passengerCount < 1) {
        context.addIssue({
          code: "custom",
          path: ["passengerCount"],
          message: "Vui lòng nhập số khách từ 1 trở lên.",
        });
      }

      if (data.luggageCount) {
        const luggageCount = Number(data.luggageCount);
        if (!Number.isInteger(luggageCount) || luggageCount < 0) {
          context.addIssue({
            code: "custom",
            path: ["luggageCount"],
            message: "Số kiện hành lý phải là số nguyên từ 0 trở lên.",
          });
        }
      }

      if (airportContext === "pickup_from_airport" && data.requestNameplate && !data.nameplateName) {
        context.addIssue({
          code: "custom",
          path: ["nameplateName"],
          message: "Vui lòng nhập tên cần hiển thị trên bảng đón khách.",
        });
      }
    });
}

type QuickBookingSchema = ReturnType<typeof buildQuickBookingSchema>;
type QuickBookingData = z.infer<QuickBookingSchema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function formatDateTimeLabel(value: string): string {
  const [datePart, timePart] = value.split("T");
  const d = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dateLabel = `${dd}/${mm}/${d.getFullYear()}`;
  return timePart ? `${dateLabel} ${timePart}` : dateLabel;
}

function datePart(value?: string): string {
  return value ? value.split("T")[0] : "";
}

type BookingPricingContext = {
  routeId?: string;
  displayRoute?: string;
  direction?: RoutePricingDirectionKey;
  packageKey?: string;
  packageLabel?: string;
  pricingMode?: RoutePricingMode;
  airportContext?: AirportBookingContext;
  airportName?: string;
};

function QuickBookingDialog({
  route,
  routeId,
  displayRoute,
  vehicleType,
  price,
  direction = "outbound",
  packageKey,
  packageLabel,
  pricingMode = "fixed",
  airportContext,
  airportName,
  onClose,
}: {
  route: string;
  routeId?: string;
  displayRoute?: string;
  vehicleType: string;
  price?: string;
  direction?: RoutePricingDirectionKey;
  packageKey?: string;
  packageLabel?: string;
  pricingMode?: Exclude<RoutePricingMode, "disabled">;
  airportContext?: AirportBookingContext;
  airportName?: string;
  onClose: () => void;
}) {
  const schema = useMemo(() => buildQuickBookingSchema(airportContext), [airportContext]);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<QuickBookingData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pickupAddress: "",
      dropoffAddress: "",
      passengerCount: "",
      luggageCount: "",
      requestNameplate: false,
    },
  });

  const visibleRoute = displayRoute || route;
  const isQuote = pricingMode === "contact";
  const visiblePrice = isQuote ? "Liên hệ để nhận báo giá" : price || "Liên hệ để nhận báo giá";
  const passengerValue = useWatch({ control, name: "passengerCount" }) ?? "";
  const requestNameplate = useWatch({ control, name: "requestNameplate" });
  const [flightNumber, landingAt, flightAt, airportTerminal, flightKind, airportArrivalAt, pickupAddress, dropoffAddress] = useWatch({ control, name: ["flightNumber", "landingAt", "flightAt", "airportTerminal", "flightKind", "airportArrivalAt", "pickupAddress", "dropoffAddress"] });
  const timingInput = {
    route_id: Number(routeId), direction, movement: airportContext === "pickup_from_airport" ? "arrival" as const : "departure" as const,
    flight_kind: flightKind || null, terminal: airportTerminal?.trim() || null,
    flight_number: flightNumber?.trim() || null, flight_at: (airportContext === "pickup_from_airport" ? landingAt : flightAt) || null,
    airport_arrival_at: airportArrivalAt || null,
  };
  const fixedAirportName = airportName || "Sân bay theo tuyến đã chọn";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function submitForm(data: QuickBookingData) {
    try {
      const schedulingValue =
        airportContext === "pickup_from_airport"
          ? data.landingAt
          : airportContext === "dropoff_at_airport"
            ? data.airportArrivalAt || data.flightAt
            : data.departureAt;
      const departureDate = datePart(schedulingValue);
      const noteParts: string[] = [isQuote ? "Yêu cầu báo giá online." : "Đặt xe online."];

      if (!airportContext && data.passengerCount) noteParts.push(`Khách: ${data.passengerCount}.`);
      if (packageLabel) noteParts.push(`Gói: ${packageLabel}.`);

      if (airportContext === "pickup_from_airport") {
        noteParts.push("Ngữ cảnh: Đón tại sân bay.");
        if (data.flightNumber) noteParts.push(`Chuyến bay: ${data.flightNumber}.`);
        if (data.landingAt) noteParts.push(`Hạ cánh: ${formatDateTimeLabel(data.landingAt)}.`);
        if (data.airportTerminal) noteParts.push(`Nhà ga: ${data.airportTerminal}.`);
        if (data.passengerCount) noteParts.push(`Khách: ${data.passengerCount}.`);
        if (data.luggageCount) noteParts.push(`Hành lý: ${data.luggageCount} kiện.`);
        if (data.requestNameplate) {
          noteParts.push(`Bảng tên: Có${data.nameplateName ? ` — ${data.nameplateName}` : ""}.`);
        }
      } else if (airportContext === "dropoff_at_airport") {
        noteParts.push("Ngữ cảnh: Tiễn sân bay.");
        if (data.flightNumber) noteParts.push(`Chuyến bay: ${data.flightNumber}.`);
        if (data.airportTerminal) noteParts.push(`Nhà ga: ${data.airportTerminal}.`);
        if (data.flightAt) noteParts.push(`Giờ bay: ${formatDateTimeLabel(data.flightAt)}.`);
        if (data.airportArrivalAt) noteParts.push(`Có mặt sân bay: ${formatDateTimeLabel(data.airportArrivalAt)}.`);
        if (data.passengerCount) noteParts.push(`Khách: ${data.passengerCount}.`);
        if (data.luggageCount) noteParts.push(`Hành lý: ${data.luggageCount} kiện.`);
      } else if (data.departureAt) {
        noteParts.push(`Ngày giờ đi: ${formatDateTimeLabel(data.departureAt)}.`);
      }

      if (airportContext && data.flightKind) noteParts.push(`Loại chuyến bay khách cung cấp: ${data.flightKind === "domestic" ? "Nội địa" : "Quốc tế"}.`);
      // Advice remains separate: no inferred pickup date/time or approval in the booking contract.
      const res = await fetchBookingWithIdempotency("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          phone: data.phone,
          route,
          routeId,
          vehicleType,
          pickupAddress: data.pickupAddress,
          dropoffAddress: data.dropoffAddress,
          pickupNote: data.pickupNote || "",
          intermediateStops: [],
          departureDate,
          direction,
          packageKey,
          pricingMode,
          note: noteParts.join(" "),
        }),
      });
      const { leadId, replayed } = await readCreatedLead(res);
      if (!replayed) trackBookingLead({ route: visibleRoute, vehicleType });
      toast.success(isQuote ? "Đã nhận yêu cầu báo giá" : "Đã nhận thông tin đặt xe", {
        description: `Mã yêu cầu #${leadId}. ${SITE_NAME} sẽ liên hệ với bạn trong thời gian sớm nhất.`,
      });
      onClose();
    } catch {
      toast.error("Gửi thông tin chưa thành công", {
        description: `Vui lòng thử lại hoặc gọi trực tiếp cho ${SITE_NAME}.`,
      });
    }
  }

  return (
    <div className="quick-booking-overlay" role="presentation" onClick={onClose}>
      <div
        className="quick-booking-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${isQuote ? "Yêu cầu báo giá" : "Đặt xe"} ${vehicleType}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="quick-booking-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <p className="section-label">{isQuote ? "YÊU CẦU BÁO GIÁ" : "ĐẶT XE ONLINE"}</p>
        <h3>Xác nhận thông tin chuyến.</h3>
        <div className="quick-booking-summary">
          <div>
            Tuyến: <strong>{visibleRoute}</strong>
          </div>
          <div>
            Loại xe: <strong>{vehicleType}</strong>
          </div>
          {packageLabel && (
            <div>
              Gói: <strong>{packageLabel}</strong>
            </div>
          )}
          {airportName && (
            <div>
              Sân bay: <strong>{airportName}</strong>
            </div>
          )}
          <div>
            Giá: <strong>{visiblePrice}</strong>
          </div>
        </div>

        <VehicleSelector selectedType={vehicleType} passengerValue={passengerValue} onPassengerChange={(value) => setValue("passengerCount", value, { shouldDirty: true })} />
        <form onSubmit={handleSubmit(submitForm)} className="quick-booking-form" noValidate>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-semibold text-foreground">Thông tin khách hàng</legend>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
              <span className="form-field-label">
                Họ tên <RequiredMark /></span>
              <input
                {...register("fullName")}
                aria-invalid={!!errors.fullName}
                placeholder="Nguyễn Văn A"
                className="form-control"
                autoFocus
              />
              <FieldError message={errors.fullName?.message} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
              <span className="form-field-label">
                Số điện thoại <RequiredMark /></span>
              <input
                {...register("phone")}
                aria-invalid={!!errors.phone}
                inputMode="tel"
                placeholder="0901 234 567"
                className="form-control"
              />
              <FieldError message={errors.phone?.message} />
            </label>
            {airportContext === "pickup_from_airport" ? (
              <div className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                <span>Điểm đón</span>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/60 px-3.5 py-3" role="status">
                  <Plane aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span><span className="block">{fixedAirportName}</span><span className="block text-xs font-normal text-muted-foreground">Đã xác định theo tuyến đã chọn</span></span>
                </div>
              </div>
            ) : (
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                <span className="form-field-label">Điểm đón cụ thể <RequiredMark /></span>
                <input {...register("pickupAddress")} maxLength={240} aria-invalid={!!errors.pickupAddress} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." />
                <FieldError message={errors.pickupAddress?.message} />
              </label>
            )}
            {airportContext === "dropoff_at_airport" ? (
              <div className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                <span>Điểm trả</span>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/60 px-3.5 py-3" role="status">
                  <Plane aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span><span className="block">{fixedAirportName}</span><span className="block text-xs font-normal text-muted-foreground">Đã xác định theo tuyến đã chọn</span></span>
                </div>
              </div>
            ) : (
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                <span className="form-field-label">Điểm trả cụ thể <RequiredMark /></span>
                <input {...register("dropoffAddress")} maxLength={240} aria-invalid={!!errors.dropoffAddress} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." />
                <FieldError message={errors.dropoffAddress?.message} />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
              <span>Lưu ý điểm đón</span>
              <textarea {...register("pickupNote")} maxLength={300} aria-invalid={!!errors.pickupNote} className="form-control min-h-24 resize-y" placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." />
              <FieldError message={errors.pickupNote?.message} />
            </label>
          </fieldset>

          {!airportContext && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
              <span>
                Ngày giờ đi
              </span>
              <input {...register("departureAt")} type="datetime-local" className="form-control" />
            </label>
          )}

          {airportContext === "pickup_from_airport" && (
            <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <legend className="px-1 text-sm font-semibold text-foreground">Thông tin chuyến bay đến</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Số hiệu chuyến bay
                  </span>
                  <input
                    {...register("flightNumber")}
                    aria-invalid={!!errors.flightNumber}
                    className="form-control"
                    placeholder="VN123"
                  />
                  <FieldError message={errors.flightNumber?.message} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Giờ hạ cánh dự kiến
                  </span>
                  <input {...register("landingAt")} type="datetime-local" aria-invalid={!!errors.landingAt} className="form-control" />
                  <FieldError message={errors.landingAt?.message} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                  <span>
                    Nhà ga
                  </span>
                  <input
                    {...register("airportTerminal")}
                    aria-invalid={!!errors.airportTerminal}
                    className="form-control"
                    placeholder="Ví dụ: T3 / Quốc tế"
                  />
                  <FieldError message={errors.airportTerminal?.message} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span className="form-field-label">
                    Số khách <RequiredMark /></span>
                  <input
                    {...register("passengerCount")}
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    aria-invalid={!!errors.passengerCount}
                    className="form-control"
                  />
                  <FieldError message={errors.passengerCount?.message} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Số kiện hành lý
                  </span>
                  <input
                    {...register("luggageCount")}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    aria-invalid={!!errors.luggageCount}
                    className="form-control"
                  />
                  <FieldError message={errors.luggageCount?.message} />
                </label>
              </div>

              <label className="flex items-start gap-2 text-sm font-semibold text-foreground">
                <input {...register("requestNameplate")} type="checkbox" className="mt-1 size-4" />
                <span>Cần bảng tên đón khách</span>
              </label>

              {requestNameplate && (
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span className="form-field-label">
                    Tên hiển thị trên bảng <RequiredMark /></span>
                  <input
                    {...register("nameplateName")}
                    aria-invalid={!!errors.nameplateName}
                    className="form-control"
                    placeholder="NGUYEN VAN A"
                  />
                  <FieldError message={errors.nameplateName?.message} />
                </label>
              )}
            </fieldset>
          )}

          {airportContext === "dropoff_at_airport" && (
            <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <legend className="px-1 text-sm font-semibold text-foreground">Thông tin chuyến bay</legend>
              <p className="m-0 text-xs leading-5 text-muted-foreground">
                Thông tin này giúp {SITE_NAME} tư vấn giờ đón phù hợp với thời gian di chuyển thực tế.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground"><span>Số hiệu chuyến bay</span><input {...register("flightNumber")} aria-invalid={!!errors.flightNumber} className="form-control" placeholder="VN123" /><FieldError message={errors.flightNumber?.message} /></label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground"><span>Nhà ga</span><input {...register("airportTerminal")} aria-invalid={!!errors.airportTerminal} className="form-control" placeholder="Nhà ga theo vé của bạn" /><FieldError message={errors.airportTerminal?.message} /></label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Giờ bay dự kiến
                  </span>
                  <input {...register("flightAt")} type="datetime-local" aria-invalid={!!errors.flightAt} className="form-control" />
                  <FieldError message={errors.flightAt?.message} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Giờ cần có mặt tại sân bay
                  </span>
                  <input {...register("airportArrivalAt")} type="datetime-local" aria-invalid={!!errors.airportArrivalAt} className="form-control" />
                  <FieldError message={errors.airportArrivalAt?.message} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span className="form-field-label">
                    Số khách <RequiredMark /></span>
                  <input
                    {...register("passengerCount")}
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    aria-invalid={!!errors.passengerCount}
                    className="form-control"
                  />
                  <FieldError message={errors.passengerCount?.message} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Số kiện hành lý
                  </span>
                  <input
                    {...register("luggageCount")}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    aria-invalid={!!errors.luggageCount}
                    className="form-control"
                  />
                  <FieldError message={errors.luggageCount?.message} />
                </label>
              </div>
            </fieldset>
          )}

          {airportContext && <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-semibold">Gợi ý giờ đón sân bay</legend>
            <label className="flex flex-col gap-1.5 text-sm font-semibold"><span>Loại chuyến bay theo vé</span><select {...register("flightKind")} aria-label="Loại chuyến bay theo vé" className="form-control"><option value="">Chưa rõ, cần tư vấn</option><option value="domestic">Nội địa</option><option value="international">Quốc tế</option></select></label>
            <AirportPickupAdvice key={JSON.stringify([timingInput, pickupAddress, dropoffAddress, vehicleType, packageKey])} input={timingInput} />
          </fieldset>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
            {isSubmitting ? "Đang gửi..." : isQuote ? "Gửi yêu cầu báo giá" : "Xác nhận đặt xe"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function RouteBookingActions({
  route,
  routeId,
  displayRoute,
  vehicleType,
  price,
  direction = "outbound",
  packageKey,
  packageLabel,
  pricingMode = "fixed",
  airportContext,
  airportName,
  compactLabels = false,
}: {
  route: string;
  vehicleType: string;
  price?: string;
  compactLabels?: boolean;
} & BookingPricingContext) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const zaloLink = getZaloChatLink();

  function closeDialog() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  if (pricingMode === "disabled") return null;

  const isQuote = pricingMode === "contact";

  return (
    <>
      <div className="detail-price-actions route-booking-actions">
        {zaloLink && (
          <Button size="sm" className="route-booking-primary zalo-cta" asChild>
            <a href={zaloLink} target="_blank" rel="noopener noreferrer" aria-label={`${isQuote ? "Nhắn Zalo báo giá" : "Nhắn Zalo đặt xe"} ${vehicleType}`} className="zalo-cta">
              <ZaloIcon />
              {isQuote ? "Nhắn Zalo báo giá" : "Nhắn Zalo đặt xe"}
            </a>
          </Button>
        )}
        <div className="route-booking-secondary">
          <Button ref={triggerRef} size="sm" variant={zaloLink ? "outline" : "default"} className="detail-price-cta" aria-label={compactLabels ? `Gửi yêu cầu ${vehicleType}` : undefined} onClick={() => setOpen(true)}>
            {compactLabels && <ClipboardList aria-hidden="true" size={20} />}{compactLabels ? "Gửi yêu cầu" : isQuote ? "Gửi yêu cầu báo giá" : "Gửi yêu cầu đặt xe"}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${SITE_HOTLINE_TEL}`} aria-label={`${isQuote ? "Gọi báo giá" : "Gọi đặt xe"} ${vehicleType}`}>
              <Phone aria-hidden="true" size={16} />
              {isQuote ? "Gọi báo giá" : "Gọi đặt xe"}
            </a>
          </Button>
        </div>
      </div>
      {!isQuote && <p className="route-booking-note">Chúng tôi xác nhận lịch xe và chi phí cuối cùng trước khi nhận chuyến.</p>}
      {open && (
        <QuickBookingDialog
          route={route}
          routeId={routeId}
          displayRoute={displayRoute}
          vehicleType={vehicleType}
          price={price}
          direction={direction}
          packageKey={packageKey}
          packageLabel={packageLabel}
          pricingMode={pricingMode}
          airportContext={airportContext}
          airportName={airportName}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

export default RouteBookingActions;
