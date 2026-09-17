"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, MessageCircle, Phone, Plane, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { MultiStopFields } from "@/components/multi-stop-fields";
import { getZaloChatLink } from "@/lib/zalo";
import { trackBookingLead } from "@/lib/analytics";
import { intermediateStopsInputSchema, type IntermediateStopInput } from "@/lib/booking-stops";
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
      intermediateStops: intermediateStopsInputSchema,
      departureAt: z.string().optional(),
      flightNumber: z.string().trim().max(40, "Số hiệu chuyến bay tối đa 40 ký tự.").optional(),
      landingAt: z.string().optional(),
      airportTerminal: z.string().trim().max(80, "Thông tin nhà ga tối đa 80 ký tự.").optional(),
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
      passengerCount: airportContext ? "1" : "",
      luggageCount: airportContext ? "0" : "",
      requestNameplate: false,
      intermediateStops: [],
    },
  });

  const visibleRoute = displayRoute || route;
  const isQuote = pricingMode === "contact";
  const visiblePrice = isQuote ? "Liên hệ để nhận báo giá" : price || "Liên hệ để nhận báo giá";
  const requestNameplate = useWatch({ control, name: "requestNameplate" });
  const intermediateStops = useWatch({ control, name: "intermediateStops" }) ?? [];
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
        if (data.flightAt) noteParts.push(`Giờ bay: ${formatDateTimeLabel(data.flightAt)}.`);
        if (data.airportArrivalAt) noteParts.push(`Có mặt sân bay: ${formatDateTimeLabel(data.airportArrivalAt)}.`);
        if (data.passengerCount) noteParts.push(`Khách: ${data.passengerCount}.`);
        if (data.luggageCount) noteParts.push(`Hành lý: ${data.luggageCount} kiện.`);
      } else if (data.departureAt) {
        noteParts.push(`Ngày giờ đi: ${formatDateTimeLabel(data.departureAt)}.`);
      }

      const res = await fetch("/api/booking", {
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
          intermediateStops: data.intermediateStops,
          departureDate,
          direction,
          packageKey,
          pricingMode,
          note: noteParts.join(" "),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Gửi yêu cầu đặt xe thất bại (HTTP ${res.status}).`);
      }
      trackBookingLead({ route: visibleRoute, vehicleType });
      toast.success(isQuote ? "Đã nhận yêu cầu báo giá" : "Đã nhận thông tin đặt xe", {
        description: `${SITE_NAME} sẽ liên hệ với bạn trong thời gian sớm nhất.`,
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

        <form onSubmit={handleSubmit(submitForm)} className="quick-booking-form" noValidate>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-semibold text-foreground">Thông tin khách hàng</legend>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
              <span>
                Họ tên <span className="text-destructive">*</span>
              </span>
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
              <span>
                Số điện thoại <span className="text-destructive">*</span>
              </span>
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
                <span>Điểm đón cụ thể <span className="text-destructive">*</span></span>
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
                <span>Điểm trả cụ thể <span className="text-destructive">*</span></span>
                <input {...register("dropoffAddress")} maxLength={240} aria-invalid={!!errors.dropoffAddress} className="form-control" placeholder="Số nhà, tên đường, phường/xã..." />
                <FieldError message={errors.dropoffAddress?.message} />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
              <span>Lưu ý điểm đón <span className="font-normal text-muted-foreground">(không bắt buộc)</span></span>
              <textarea {...register("pickupNote")} maxLength={300} aria-invalid={!!errors.pickupNote} className="form-control min-h-24 resize-y" placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." />
              <FieldError message={errors.pickupNote?.message} />
            </label>
            <MultiStopFields
              stops={intermediateStops as IntermediateStopInput[]}
              onChange={(stops) => setValue("intermediateStops", stops, { shouldDirty: true, shouldValidate: true })}
              errors={errors.intermediateStops as MultiStopFieldsError[] | undefined}
            />
          </fieldset>

          {!airportContext && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
              <span>
                Ngày giờ đi <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
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
                    Số hiệu chuyến bay <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
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
                    Giờ hạ cánh dự kiến <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
                  </span>
                  <input {...register("landingAt")} type="datetime-local" className="form-control" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                  <span>
                    Nhà ga <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
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
                  <span>
                    Số khách <span className="text-destructive">*</span>
                  </span>
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
                    Số kiện hành lý <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
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
                  <span>
                    Tên hiển thị trên bảng <span className="text-destructive">*</span>
                  </span>
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
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Giờ bay dự kiến <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
                  </span>
                  <input {...register("flightAt")} type="datetime-local" className="form-control" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Giờ cần có mặt tại sân bay <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
                  </span>
                  <input {...register("airportArrivalAt")} type="datetime-local" className="form-control" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                  <span>
                    Số khách <span className="text-destructive">*</span>
                  </span>
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
                    Số kiện hành lý <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
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

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
            {isSubmitting ? "Đang gửi..." : isQuote ? "Gửi yêu cầu báo giá" : "Xác nhận đặt xe"}
          </Button>
        </form>
      </div>
    </div>
  );
}

type MultiStopFieldsError = {
  address?: { message?: string };
  waitingMinutes?: { message?: string };
};

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
}: {
  route: string;
  vehicleType: string;
  price?: string;
} & BookingPricingContext) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const zaloLink = getZaloChatLink();

  function closeDialog() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  if (pricingMode === "disabled") return null;

  if (pricingMode === "contact") {
    return (
      <>
        <div className="detail-price-actions flex-wrap">
          <Button ref={triggerRef} size="sm" className="detail-price-cta min-w-full" onClick={() => setOpen(true)}>
            Yêu cầu báo giá
          </Button>
          {zaloLink && (
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <a href={zaloLink} target="_blank" rel="noopener noreferrer" aria-label={`Nhắn Zalo nhận báo giá xe ${vehicleType}`}>
                <MessageCircle data-icon="inline-start" size={16} />
                Nhắn Zalo
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <a href={`tel:${SITE_HOTLINE_TEL}`} aria-label={`Gọi nhận báo giá xe ${vehicleType}`}>
              <Phone data-icon="inline-start" size={16} />
              Gọi báo giá
            </a>
          </Button>
        </div>
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
            pricingMode="contact"
            airportContext={airportContext}
            airportName={airportName}
            onClose={closeDialog}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="detail-price-actions">
        <Button ref={triggerRef} size="sm" className="detail-price-cta" onClick={() => setOpen(true)}>
          Đặt xe online
        </Button>
        {zaloLink && (
          <a
            href={zaloLink}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-price-icon-cta"
            aria-label={`Đặt xe ${vehicleType} qua Zalo`}
          >
            <MessageCircle size={16} />
          </a>
        )}
        <a
          href={`tel:${SITE_HOTLINE_TEL}`}
          className="detail-price-icon-cta"
          aria-label={`Gọi điện đặt xe ${vehicleType}`}
        >
          <Phone size={16} />
        </a>
      </div>
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
          pricingMode="fixed"
          airportContext={airportContext}
          airportName={airportName}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

export default RouteBookingActions;
