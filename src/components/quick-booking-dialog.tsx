"use client";

import { AirportPickupAdvice } from "@/components/airport-pickup-advice";
import { validateFlightFields } from "@/lib/airport-timing";
import { RequiredMark } from "@/components/required-mark";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { CouponQuote } from "@/types/coupon";
import { promotionCodeInput } from "@/lib/booking-promotion-code";
import { rememberBookingReceipt } from "@/lib/booking-receipt";
import "./quick-booking-dialog.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plane, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { trackBookingLead } from "@/lib/analytics";
import { fetchBookingWithIdempotency } from "@/lib/booking-submit";
import { readCreatedLead } from "@/lib/lead-response";
import { SITE_NAME } from "@/lib/site-config";
import type { RoutePricingDirectionKey, RoutePricingMode } from "@/types/route";

const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

function buildQuickBookingSchema(airportContext?: AirportBookingContext) {
  return z
    .object({
      promotionCode: promotionCodeInput.optional(),
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

import type { AirportBookingContext, BookingPricingContext } from "@/components/route-booking-actions";

export function QuickBookingDialog({
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
  initialTrip,
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
  initialTrip?: BookingPricingContext["initialTrip"];
  onClose: () => void;
}) {
  const schema = useMemo(() => buildQuickBookingSchema(airportContext), [airportContext]);
  const {
    register,
    handleSubmit,
    control,
    trigger,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuickBookingData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "", phone: "", promotionCode: "",
      pickupAddress: initialTrip?.pickupAddress ?? "",
      dropoffAddress: initialTrip?.dropoffAddress ?? "",
      departureAt: initialTrip?.departureAt ?? "",
      passengerCount: "",
      luggageCount: "",
      requestNameplate: false,
    },
  });

  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [confirmed, setConfirmed] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [sending, setSending] = useState(false);
  const [applyingCode, setApplyingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [couponEntry, setCouponEntry] = useState<{ contextKey: string; quote: CouponQuote } | null>(null);
  const busy = isSubmitting || sending || applyingCode;
  const sendingRef = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const contactFields = ["fullName", "phone", "pickupNote"] as const;
  const tripFields = ["promotionCode", "pickupAddress", "dropoffAddress", "departureAt", "flightNumber", "landingAt", "airportTerminal", "flightKind", "flightAt", "airportArrivalAt", "passengerCount", "luggageCount", "requestNameplate", "nameplateName"] as const;
  const stepTitles = ["Xác nhận chuyến đi", "Thông tin liên hệ", "Kiểm tra trước khi gửi"];

  function goToStep(next: 1 | 2 | 3) { if (sendingRef.current) return; setConfirmed(false); setSubmissionError(""); setStep(next); }
  async function nextStep() {
    if (step === 1 && getValues("promotionCode")?.trim() && !activeCoupon) { setCodeError("Vui lòng áp dụng mã hoặc bỏ mã trước khi tiếp tục."); return; }
    const valid = await trigger(step === 1 ? [...tripFields] : [...contactFields], { shouldFocus: true });
    if (valid) goToStep(step === 1 ? 2 : 3);
  }

  const visibleRoute = displayRoute || route;
  const isQuote = pricingMode === "contact";
  const visiblePrice = isQuote ? "Liên hệ để nhận báo giá" : price || "Liên hệ để nhận báo giá";
  const requestNameplate = useWatch({ control, name: "requestNameplate" });
  const [flightNumber, landingAt, flightAt, airportTerminal, flightKind, airportArrivalAt, pickupAddress, dropoffAddress] = useWatch({ control, name: ["flightNumber", "landingAt", "flightAt", "airportTerminal", "flightKind", "airportArrivalAt", "pickupAddress", "dropoffAddress"] });
  const timingInput = {
    route_id: Number(routeId), direction, movement: airportContext === "pickup_from_airport" ? "arrival" as const : "departure" as const,
    flight_kind: flightKind || null, terminal: airportTerminal?.trim() || null,
    flight_number: flightNumber?.trim() || null, flight_at: (airportContext === "pickup_from_airport" ? landingAt : flightAt) || null,
    airport_arrival_at: airportArrivalAt || null,
  };
  const [promotionCode, departureAt] = useWatch({ control, name: ["promotionCode", "departureAt"] });
  function couponContext(data: QuickBookingData) {
    const schedule = airportContext === "pickup_from_airport" ? data.landingAt : airportContext === "dropoff_at_airport" ? data.airportArrivalAt || data.flightAt : data.departureAt;
    return { promotionCode: data.promotionCode?.trim().toUpperCase() || "", routeId, vehicleType, direction, packageKey,
      departureDate: datePart(schedule), departureTime: schedule?.split("T")[1]?.slice(0, 5) || "" };
  }
  // Derive validity from current selections; stale async replies cannot attach to a different trip.
  const couponContextKey = JSON.stringify({ promotionCode: promotionCode?.trim().toUpperCase() || "", routeId, vehicleType, direction, packageKey,
    departureDate: datePart(airportContext === "pickup_from_airport" ? landingAt : airportContext === "dropoff_at_airport" ? airportArrivalAt || flightAt : departureAt),
    departureTime: (airportContext === "pickup_from_airport" ? landingAt : airportContext === "dropoff_at_airport" ? airportArrivalAt || flightAt : departureAt)?.split("T")[1]?.slice(0, 5) || "" });
  const activeCoupon = couponEntry?.contextKey === couponContextKey ? couponEntry.quote : null;
  const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  async function applyCode() {
    if (busy || sendingRef.current) return;
    setConfirmed(false); setCodeError(""); setCouponEntry(null);
    if (!(await trigger("promotionCode"))) return;
    const context = couponContext(getValues());
    if (!context.promotionCode) { setCodeError("Vui lòng nhập mã khuyến mãi."); return; }
    setApplyingCode(true);
    try {
      const response = await fetch("/api/booking/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(context) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || "Chưa kiểm tra được mã.");
      if (JSON.stringify(couponContext(getValues())) === JSON.stringify(context)) setCouponEntry({ contextKey: JSON.stringify(context), quote: result.quote });
    } catch (error) { setCodeError(error instanceof Error ? error.message : "Chưa kiểm tra được mã. Vui lòng thử lại."); }
    finally { setApplyingCode(false); }
  }
  function removeCode() { setValue("promotionCode", ""); setCouponEntry(null); setCodeError(""); setConfirmed(false); }
  const fixedAirportName = airportName || "Sân bay theo tuyến đã chọn";

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousModal = body.getAttribute("data-booking-dialog-open");
    body.style.overflow = "hidden";
    body.setAttribute("data-booking-dialog-open", "true");
    const siblings = Array.from(body.children).filter((element) => element !== overlayRef.current && element instanceof HTMLElement) as HTMLElement[];
    const inertStates = siblings.map((element) => element.inert);
    siblings.forEach((element) => { element.inert = true; });
    const viewport = window.visualViewport;
    function fitViewport() {
      overlayRef.current?.style.setProperty("--booking-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      overlayRef.current?.style.setProperty("--booking-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    }
    fitViewport();
    viewport?.addEventListener("resize", fitViewport);
    viewport?.addEventListener("scroll", fitViewport);
    window.addEventListener("resize", fitViewport);
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { if (!sendingRef.current) onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') ?? []).filter((element) => element.offsetParent !== null);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", fitViewport);
      viewport?.removeEventListener("resize", fitViewport);
      viewport?.removeEventListener("scroll", fitViewport);
      siblings.forEach((element, index) => { element.inert = inertStates[index]; });
      body.style.overflow = previousOverflow;
      if (previousModal === null) body.removeAttribute("data-booking-dialog-open");
      else body.setAttribute("data-booking-dialog-open", previousModal);
    };
  }, [onClose]);

  useEffect(() => { headingRef.current?.focus(); if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [step]);

  async function submitForm(data: QuickBookingData) {
    if (step !== 3 || !confirmed || sendingRef.current || applyingCode) return;
    if (data.promotionCode?.trim() && !activeCoupon) { setCodeError("Vui lòng áp dụng lại mã cho chuyến đã chọn."); goToStep(1); return; }
    sendingRef.current = true;
    setSending(true);
    setSubmissionError("");
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
          ...(activeCoupon ? { promotionCode: activeCoupon.code, couponQuoteKey: activeCoupon.quoteKey } : {}),
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
          departureTime: schedulingValue?.split("T")[1]?.slice(0, 5) || "",
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
      rememberBookingReceipt(leadId, isQuote ? "quote" : "booking");
      onClose();
      router.push("/cam-on");
    } catch (error) {
      setConfirmed(false);
      setSubmissionError(error instanceof Error ? error.message : "Gửi yêu cầu chưa thành công. Thông tin vẫn được giữ để bạn thử lại.");
      toast.error("Gửi thông tin chưa thành công", {
        description: `Vui lòng thử lại hoặc gọi trực tiếp cho ${SITE_NAME}.`,
      });
    } finally { sendingRef.current = false; setSending(false); }
  }

  const values = getValues();
  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={overlayRef} className="home-redesign quick-booking-overlay quick-booking-wizard" role="presentation" onClick={() => { if (!sendingRef.current) onClose(); }}>
      <section ref={panelRef} className="quick-booking-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <header className="quick-booking-header">
          <p className="section-label">{isQuote ? "YÊU CẦU BÁO GIÁ" : "ĐẶT XE ONLINE"} · BƯỚC {step}/3</p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>{stepTitles[step - 1]}</h2>
          <button type="button" className="quick-booking-close" disabled={busy} onClick={onClose} aria-label="Đóng"><X size={18} /></button>
          <ol className="quick-booking-progress" aria-label="Các bước đặt xe">{["Chuyến đi", "Liên hệ", "Xác nhận"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={step >= index + 1 ? "is-active" : ""}><span>{index + 1}</span>{label}</li>)}</ol>
        </header>
        <form className="quick-booking-form" noValidate onSubmit={(event) => {
          if (step !== 3) { event.preventDefault(); void nextStep(); return; }
          void handleSubmit(submitForm, (invalid) => { goToStep(contactFields.some((field) => invalid[field]) ? 2 : 1); })(event);
        }}>
          <div ref={bodyRef} className="quick-booking-body">
            {step === 1 && <>
              <dl className="quick-booking-summary"><div><dt>Chiều đi</dt><dd>{visibleRoute}</dd></div><div><dt>Gói dịch vụ</dt><dd>{packageLabel || "Cần tư vấn"}</dd></div><div><dt>Loại xe</dt><dd>{vehicleType}</dd></div><div><dt>{isQuote ? "Giá" : "Giá tham khảo"}</dt><dd>{visiblePrice}</dd></div></dl>
              <p className="quick-booking-price-note">Lịch xe và chi phí cuối cùng được xác nhận theo thông tin chuyến trước khi nhận chuyến.</p>
              <fieldset className="flex flex-col gap-3"><legend className="mb-2 text-sm font-semibold">Điểm đón và điểm trả</legend>
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
                <span>Muốn hỏi về bảng tên đón khách</span>
              </label>
              <p className="m-0 text-xs text-muted-foreground">Nhu cầu bảng tên cần được xác nhận về khả năng phục vụ và chi phí; chưa bao gồm mặc định.</p>

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
              <fieldset className="quick-booking-coupon" disabled={busy}><legend>Mã khuyến mãi (nếu có)</legend>
                <label className="sr-only" htmlFor={`${titleId}-code`}>Mã khuyến mãi</label>
                <div className="quick-booking-coupon-controls"><input id={`${titleId}-code`} {...register("promotionCode")} maxLength={64} aria-invalid={!!errors.promotionCode || !!codeError} aria-describedby={`${titleId}-code-note`} className="form-control" autoComplete="off" autoCapitalize="characters" placeholder="Nhập mã bạn đang có" />
                <Button type="button" variant="outline" onClick={applyCode} disabled={busy || isQuote}>{applyingCode ? "Đang kiểm tra..." : "Áp dụng"}</Button>
                {promotionCode && <button type="button" onClick={removeCode}>Bỏ mã</button>}</div>
                <FieldError message={errors.promotionCode?.message} />
                <div id={`${titleId}-code-note`} aria-live="polite">
                  {codeError ? <p className="quick-booking-error">{codeError}</p> : activeCoupon ? <p>Đã áp dụng mã {activeCoupon.code}.</p> : <p className="quick-booking-price-note">{isQuote ? "Chuyến cần tư vấn báo giá, chưa áp dụng mã tự động." : "Mã giảm trên giá chuyến cơ bản. Phụ phí tính riêng."}</p>}
                </div>
                {activeCoupon && <dl className="quick-booking-summary"><div><dt>Giá trước giảm</dt><dd>{money(activeCoupon.before)}</dd></div><div><dt>Giảm theo mã</dt><dd>−{money(activeCoupon.discount)}</dd></div><div><dt>Giá sau giảm</dt><dd>{money(activeCoupon.after)}</dd></div></dl>}
                <p className="quick-booking-price-note">Mã được kiểm tra lại khi gửi yêu cầu đặt xe.</p>
              </fieldset>
            </>}
            {step === 2 && <fieldset className="flex flex-col gap-3"><legend className="sr-only">Thông tin liên hệ</legend>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
              <span className="form-field-label">
                Họ tên <RequiredMark /></span>
              <input
                {...register("fullName")}
                aria-invalid={!!errors.fullName}
                placeholder="Nguyễn Văn A"
                className="form-control"
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
              <details className="quick-booking-extra"><summary>Bổ sung hướng dẫn đón khách</summary>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
              <span>Lưu ý điểm đón</span>
              <textarea {...register("pickupNote")} maxLength={300} aria-invalid={!!errors.pickupNote} className="form-control min-h-24 resize-y" placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..." />
              <FieldError message={errors.pickupNote?.message} />
            </label>
              </details>
            </fieldset>}
            {step === 3 && <>
              <div className="quick-booking-review-heading"><h3>Hành khách</h3><button type="button" disabled={busy} onClick={() => goToStep(2)}>Sửa liên hệ</button></div>
              <dl className="quick-booking-summary"><div><dt>Họ tên</dt><dd>{values.fullName}</dd></div><div><dt>Số điện thoại</dt><dd>{values.phone}</dd></div></dl>
              <div className="quick-booking-review-heading"><h3>Chuyến đi</h3><button type="button" disabled={busy} onClick={() => goToStep(1)}>Sửa chuyến đi</button></div>
              <dl className="quick-booking-summary">
                <div><dt>Chiều đi</dt><dd>{visibleRoute}</dd></div><div><dt>Gói dịch vụ</dt><dd>{packageLabel || "Cần tư vấn"}</dd></div><div><dt>Loại xe</dt><dd>{vehicleType}</dd></div><div><dt>{isQuote ? "Giá" : "Giá tham khảo"}</dt><dd>{visiblePrice}</dd></div>
                <div><dt>Điểm đón</dt><dd>{airportContext === "pickup_from_airport" ? fixedAirportName : values.pickupAddress}</dd></div>
                <div><dt>Điểm trả</dt><dd>{airportContext === "dropoff_at_airport" ? fixedAirportName : values.dropoffAddress}</dd></div>
                <div><dt>{airportContext === "pickup_from_airport" ? "Giờ hạ cánh" : airportContext === "dropoff_at_airport" ? "Giờ bay" : "Ngày giờ đi"}</dt><dd>{(airportContext === "pickup_from_airport" ? values.landingAt : airportContext === "dropoff_at_airport" ? values.flightAt : values.departureAt) ? formatDateTimeLabel((airportContext === "pickup_from_airport" ? values.landingAt : airportContext === "dropoff_at_airport" ? values.flightAt : values.departureAt)!) : "Cần tư vấn"}</dd></div>
                {values.airportArrivalAt && <div><dt>Có mặt tại sân bay</dt><dd>{formatDateTimeLabel(values.airportArrivalAt)}</dd></div>}
                {values.flightNumber && <div><dt>Chuyến bay</dt><dd>{values.flightNumber}</dd></div>}
                {values.airportTerminal && <div><dt>Nhà ga</dt><dd>{values.airportTerminal}</dd></div>}
                {values.flightKind && <div><dt>Loại chuyến bay</dt><dd>{values.flightKind === "domestic" ? "Nội địa" : "Quốc tế"}</dd></div>}
                {values.passengerCount && <div><dt>Số khách</dt><dd>{values.passengerCount}</dd></div>}
                {values.luggageCount && <div><dt>Hành lý</dt><dd>{values.luggageCount} kiện</dd></div>}
                {values.requestNameplate && <div><dt>Hỏi về bảng tên</dt><dd>{values.nameplateName} · Cần xác nhận</dd></div>}
                {values.pickupNote && <div><dt>Lưu ý điểm đón</dt><dd>{values.pickupNote}</dd></div>}
                {activeCoupon && <><div><dt>Mã khuyến mãi</dt><dd>{activeCoupon.code}</dd></div><div><dt>Giá trước giảm</dt><dd>{money(activeCoupon.before)}</dd></div><div><dt>Số tiền giảm</dt><dd>−{money(activeCoupon.discount)}</dd></div><div><dt>Giá sau giảm</dt><dd>{money(activeCoupon.after)}</dd></div></>}
              </dl>
              <p className="quick-booking-price-note">Alo Đặt Xe xác nhận lịch xe và chi phí cuối cùng trước khi nhận chuyến.</p>
              <label className="quick-booking-agreement"><input type="checkbox" disabled={busy} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Tôi đã kiểm tra thông tin trên.</label>
            </>}
            {submissionError && <p className="quick-booking-error" role="alert">{submissionError}</p>}
          </div>
          <footer className="quick-booking-controls">
            {step > 1 && <Button type="button" variant="outline" disabled={busy} onClick={() => goToStep(step === 3 ? 2 : 1)}>Quay lại</Button>}
            <Button type="submit" disabled={busy || (step === 3 && !confirmed)}>
              {busy && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
              {busy ? "Đang gửi..." : step < 3 ? "Tiếp tục" : isQuote ? "Đồng ý gửi yêu cầu báo giá" : "Đồng ý đặt xe"}
            </Button>
          </footer>
        </form>
      </section>
    </div>, document.body,
  );
}

