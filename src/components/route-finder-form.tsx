"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, BusFront, CalendarDays, LoaderCircle, MapPin, Repeat2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { routeHref, type Route, type RoutePricingDirectionKey } from "@/types/route";

type BookingSearchVariant = "default" | "hero" | "compact";
type BookingTripType = "one_way" | "round_trip";
type SearchPricingMode = "fixed" | "contact";

type BookingJourney = {
  route: Route;
  direction: RoutePricingDirectionKey;
};

const CONSULT_VEHICLE = "__consult_vehicle__";
const CONSULT_VEHICLE_LABEL = "Chưa biết — tư vấn loại xe phù hợp";
const BOOKING_VEHICLE_FALLBACK = "Chưa xác định";
const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export type BookingSearchFormProps = {
  routes: Route[];
  id?: string;
  variant?: BookingSearchVariant;
  initialPickup?: string;
  initialDestination?: string;
  source?: string;
};

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

function localDateIso(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function tripTypeLabel(value: BookingTripType) {
  return value === "round_trip" ? "Khứ hồi" : "Một chiều";
}

function supportsDirection(route: Route, direction: RoutePricingDirectionKey) {
  if (!route.pricingV2) return direction === "outbound";
  return route.pricingV2[direction].enabled;
}

function findJourney(routes: Route[], pickup: string, destination: string): BookingJourney | undefined {
  const normalizedPickup = normalizeSearch(pickup);
  const normalizedDestination = normalizeSearch(destination);
  if (!normalizedPickup || !normalizedDestination || normalizedPickup === normalizedDestination) return undefined;

  for (const route of routes) {
    const routeFrom = normalizeSearch(route.from);
    const routeTo = normalizeSearch(route.to);

    if (
      routeFrom === normalizedPickup &&
      routeTo === normalizedDestination &&
      supportsDirection(route, "outbound")
    ) {
      return { route, direction: "outbound" };
    }

    if (
      routeTo === normalizedPickup &&
      routeFrom === normalizedDestination &&
      supportsDirection(route, "inbound")
    ) {
      return { route, direction: "inbound" };
    }
  }

  return undefined;
}

function uniqueLocations(routes: Route[]) {
  const values = new Map<string, string>();

  for (const route of routes) {
    values.set(normalizeSearch(route.from), route.from);
    values.set(normalizeSearch(route.to), route.to);
  }

  return Array.from(values.values()).sort((a, b) => a.localeCompare(b, "vi"));
}

function uniqueVehicleTypes(routes: Route[]) {
  const values = new Map<string, string>();

  for (const route of routes) {
    if (route.pricingV2) {
      for (const direction of [route.pricingV2.outbound, route.pricingV2.inbound]) {
        if (!direction.enabled) continue;
        for (const row of direction.packages) {
          if (row.mode !== "disabled" && row.vehicleType) values.set(row.vehicleType, row.vehicleType);
        }
      }
      continue;
    }

    for (const row of route.pricingByVehicle) {
      if (row.vehicleType) values.set(row.vehicleType, row.vehicleType);
    }
    for (const vehicleType of route.vehicleTypes) {
      if (vehicleType) values.set(vehicleType, vehicleType);
    }
  }

  return Array.from(values.values());
}

function vehicleTypesForJourney(journey: BookingJourney) {
  if (!journey.route.pricingV2) {
    return Array.from(
      new Set([
        ...journey.route.pricingByVehicle.map((item) => item.vehicleType),
        ...journey.route.vehicleTypes,
      ].filter(Boolean)),
    );
  }

  return Array.from(
    new Set(
      journey.route.pricingV2[journey.direction].packages
        .filter((item) => item.mode !== "disabled")
        .map((item) => item.vehicleType)
        .filter(Boolean),
    ),
  );
}

function pricingModeForVehicle(journey: BookingJourney | undefined, vehicleType: string): SearchPricingMode {
  if (!journey || vehicleType === CONSULT_VEHICLE) return "contact";
  if (!journey.route.pricingV2) return "fixed";

  const rows = journey.route.pricingV2[journey.direction].packages.filter(
    (item) => item.vehicleType === vehicleType && item.mode !== "disabled",
  );

  if (rows.some((item) => item.mode === "fixed" && typeof item.price === "number" && item.price > 0)) {
    return "fixed";
  }
  return "contact";
}

function LocationField({
  label,
  value,
  onChange,
  placeholder,
  listId,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  listId: string;
  options: string[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground">
      <span>{label}</span>
      <span className="relative block">
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
          size={18}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          list={listId}
          placeholder={placeholder}
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base font-medium text-foreground outline-none transition placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
          required
        />
        <datalist id={listId}>
          {options.map((option) => (
            <option value={option} key={option} />
          ))}
        </datalist>
      </span>
    </label>
  );
}

function JourneyQuoteDialog({
  pickup,
  destination,
  departureDate,
  tripType,
  vehicleType,
  journey,
  source,
  onClose,
}: {
  pickup: string;
  destination: string;
  departureDate: string;
  tripType: BookingTripType;
  vehicleType: string;
  journey?: BookingJourney;
  source: string;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const visibleVehicle = vehicleType === CONSULT_VEHICLE ? CONSULT_VEHICLE_LABEL : vehicleType;
  const bookingVehicle = vehicleType === CONSULT_VEHICLE ? BOOKING_VEHICLE_FALLBACK : vehicleType;
  const routeLabel = `${pickup.trim()} – ${destination.trim()}`;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    if (!phoneRegex.test(phone.trim().replace(/\s+/g, ""))) {
      setError("Số điện thoại chưa đúng định dạng Việt Nam.");
      return;
    }

    setIsSubmitting(true);
    try {
      const noteParts = [
        journey ? "Yêu cầu báo giá từ Booking Search." : "Custom Journey: chưa có Route canonical phù hợp tại thời điểm gửi.",
        `Loại chuyến: ${tripTypeLabel(tripType)}.`,
        `Nguồn: ${source}.`,
      ];
      if (vehicleType === CONSULT_VEHICLE) noteParts.push("Khách cần tư vấn loại xe phù hợp.");

      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim().replace(/\s+/g, ""),
          route: routeLabel,
          routeId: journey?.route.id,
          vehicleType: bookingVehicle,
          departureDate,
          direction: journey?.direction,
          pricingMode: "contact",
          note: noteParts.join(" "),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Gửi yêu cầu báo giá chưa thành công.");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gửi yêu cầu báo giá chưa thành công.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="quick-booking-overlay" role="presentation" onClick={onClose}>
      <div
        className="quick-booking-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Yêu cầu báo giá ${routeLabel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="quick-booking-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>

        {submitted ? (
          <div className="flex flex-col gap-4">
            <p className="section-label">ĐÃ NHẬN YÊU CẦU</p>
            <h3>Cảm ơn bạn. Gocar VN sẽ liên hệ để báo giá.</h3>
            <p className="m-0 text-sm leading-6 text-muted-foreground">
              Hành trình {pickup} → {destination}, {formatDateLabel(departureDate)}, {visibleVehicle} đã được ghi nhận.
            </p>
            <Button type="button" onClick={onClose}>Đóng</Button>
          </div>
        ) : (
          <>
            <p className="section-label">YÊU CẦU BÁO GIÁ</p>
            <h3>Xác nhận nhu cầu chuyến xe.</h3>
            <div className="quick-booking-summary">
              <div>Tuyến: <strong>{pickup} → {destination}</strong></div>
              <div>Ngày đi: <strong>{formatDateLabel(departureDate)}</strong></div>
              <div>Loại chuyến: <strong>{tripTypeLabel(tripType)}</strong></div>
              <div>Loại xe: <strong>{visibleVehicle}</strong></div>
              <div>Giá: <strong>Gocar VN xác nhận theo hành trình thực tế</strong></div>
            </div>

            <form className="quick-booking-form" onSubmit={submitQuote} noValidate>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                <span>Họ tên <span className="text-destructive">*</span></span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="form-control"
                  placeholder="Nguyễn Văn A"
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground">
                <span>Số điện thoại <span className="text-destructive">*</span></span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="form-control"
                  inputMode="tel"
                  placeholder="0901 234 567"
                />
              </label>
              {error && <p className="m-0 text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
                {isSubmitting ? "Đang gửi..." : "Nhận báo giá"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Entry point chung cho booking funnel.
 * Route canonical có Pricing V2 thì dẫn tới đúng bảng giá; hành trình chưa có Route vẫn được nhận
 * như Custom Journey để tư vấn/báo giá, tuyệt đối không tự suy diễn giá từ tuyến khác.
 */
export function BookingSearchForm({
  routes,
  id,
  variant = "default",
  initialPickup = "",
  initialDestination = "",
  source,
}: BookingSearchFormProps) {
  const instanceId = useId();
  const pickupListId = `${instanceId}-pickup`;
  const destinationListId = `${instanceId}-destination`;
  const headingId = `${instanceId}-title`;
  const [pickup, setPickup] = useState(initialPickup);
  const [destination, setDestination] = useState(initialDestination);
  const [departureDate, setDepartureDate] = useState("");
  const [tripType, setTripType] = useState<BookingTripType>("one_way");
  const [vehicleType, setVehicleType] = useState("");
  const [error, setError] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);

  const locations = useMemo(() => uniqueLocations(routes), [routes]);
  const globalVehicleTypes = useMemo(() => uniqueVehicleTypes(routes), [routes]);
  const journey = useMemo(() => findJourney(routes, pickup, destination), [routes, pickup, destination]);
  const availableVehicleTypes = useMemo(
    () => (journey ? vehicleTypesForJourney(journey) : globalVehicleTypes),
    [globalVehicleTypes, journey],
  );
  const resolvedSource = source || (variant === "hero" ? "homepage_hero" : `booking_search_${variant}`);
  const isCompact = variant === "compact";
  const selectedPricingMode = vehicleType ? pricingModeForVehicle(journey, vehicleType) : undefined;
  const needsQuote = Boolean(vehicleType && (!journey || selectedPricingMode === "contact"));

  function resetJourneyDependentFields() {
    setVehicleType("");
    setError("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!pickup.trim() || !destination.trim()) {
      setError("Vui lòng chọn đầy đủ điểm đón và điểm đến.");
      return;
    }
    if (normalizeSearch(pickup) === normalizeSearch(destination)) {
      setError("Điểm đón và điểm đến phải khác nhau.");
      return;
    }
    if (!departureDate) {
      setError("Vui lòng chọn ngày đi.");
      return;
    }
    if (departureDate < localDateIso(new Date())) {
      setError("Ngày đi không thể nằm trong quá khứ.");
      return;
    }
    if (!vehicleType) {
      setError("Vui lòng chọn loại xe hoặc chọn phương án cần tư vấn.");
      return;
    }

    if (!journey || selectedPricingMode === "contact") {
      setQuoteOpen(true);
      return;
    }

    const params = new URLSearchParams({
      direction: journey.direction,
      ngay_di: departureDate,
      trip_type: tripType,
      source: resolvedSource,
    });
    if (vehicleType !== CONSULT_VEHICLE) params.set("vehicle_type", vehicleType);

    window.location.assign(`${routeHref(journey.route)}?${params.toString()}#pricing`);
  }

  const outerClass = variant === "hero" || isCompact ? "w-full" : "section-wrap";
  const panelClass = isCompact
    ? "rounded-2xl border border-border bg-card p-4"
    : variant === "hero"
      ? "rounded-[28px] border border-border bg-card/95 p-5 text-foreground shadow-[0_22px_70px_rgba(11,79,75,0.16)] backdrop-blur sm:p-6"
      : "rounded-[28px] border border-border bg-card p-5 text-foreground sm:p-6";
  const fieldsClass = isCompact ? "grid gap-3 md:grid-cols-2 xl:grid-cols-5" : "grid gap-3 sm:grid-cols-2";
  const helperText = pickup.trim() && destination.trim() && !journey
    ? "Chưa có bảng giá sẵn cho hành trình này. Bạn vẫn có thể chọn xe và gửi yêu cầu báo giá ngay."
    : journey
      ? "Đã nhận diện tuyến có dữ liệu. Loại xe được lọc theo đúng chiều di chuyển và Pricing V2 hiện có."
      : "Nhập hành trình để hệ thống kiểm tra bảng giá; tuyến chưa có dữ liệu vẫn được tiếp nhận báo giá riêng.";

  return (
    <section className={outerClass} id={id} aria-labelledby={headingId}>
      <form className={panelClass} onSubmit={handleSubmit} noValidate>
        {!isCompact && (
          <div className="mb-5">
            <p className="section-label">ĐẶT XE NHANH</p>
            <h2 id={headingId} className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Bạn muốn đi đâu?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Chọn hành trình, ngày đi và loại xe. Tuyến có bảng giá sẽ hiển thị giá; tuyến khác vẫn nhận báo giá riêng.
            </p>
          </div>
        )}

        {isCompact && <h2 id={headingId} className="sr-only">Tìm chuyến xe</h2>}

        <div className={fieldsClass}>
          <LocationField
            label="Điểm đón"
            value={pickup}
            onChange={(value) => {
              setPickup(value);
              resetJourneyDependentFields();
            }}
            placeholder="Ví dụ: Biên Hòa"
            listId={pickupListId}
            options={locations}
          />

          <LocationField
            label="Điểm đến"
            value={destination}
            onChange={(value) => {
              setDestination(value);
              resetJourneyDependentFields();
            }}
            placeholder="Ví dụ: Cần Thơ"
            listId={destinationListId}
            options={locations}
          />

          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground">
            <span>Ngày đi</span>
            <span className="relative block">
              <CalendarDays
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                size={18}
              />
              <input
                type="date"
                min={localDateIso(new Date())}
                value={departureDate}
                onChange={(event) => {
                  setDepartureDate(event.target.value);
                  setError("");
                }}
                className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
              />
            </span>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground">
            <span>Loại chuyến</span>
            <span className="relative block">
              <Repeat2
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                size={18}
              />
              <select
                value={tripType}
                onChange={(event) => {
                  setTripType(event.target.value as BookingTripType);
                  setError("");
                }}
                className="h-12 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-8 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="one_way">Một chiều</option>
                <option value="round_trip">Khứ hồi</option>
              </select>
            </span>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2 xl:col-span-1">
            <span>Loại xe</span>
            <span className="relative block">
              <BusFront
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                size={18}
              />
              <select
                value={vehicleType}
                onChange={(event) => {
                  setVehicleType(event.target.value);
                  setError("");
                }}
                className="h-12 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-8 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
              >
                <option value="">Chọn loại xe</option>
                {availableVehicleTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
                <option value={CONSULT_VEHICLE}>{CONSULT_VEHICLE_LABEL}</option>
              </select>
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Button size="lg" type="submit" className="w-full">
            {needsQuote ? "Yêu cầu báo giá" : "Xem giá chuyến xe"} <ArrowRight data-icon="inline-end" />
          </Button>

          <div className="min-h-5 text-sm" aria-live="polite">
            {error ? (
              <p className="m-0 text-destructive">{error}</p>
            ) : (
              <p className="m-0 text-muted-foreground">{helperText}</p>
            )}
          </div>
        </div>
      </form>

      {quoteOpen && (
        <JourneyQuoteDialog
          pickup={pickup}
          destination={destination}
          departureDate={departureDate}
          tripType={tripType}
          vehicleType={vehicleType}
          journey={journey}
          source={resolvedSource}
          onClose={() => setQuoteOpen(false)}
        />
      )}
    </section>
  );
}

/** Giữ tên cũ để các trang đang dùng RouteFinderForm không bị breaking change. */
export function RouteFinderForm(props: BookingSearchFormProps) {
  return <BookingSearchForm {...props} />;
}
