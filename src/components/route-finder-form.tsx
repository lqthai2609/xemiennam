"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowRightLeft, BusFront, CalendarDays, LoaderCircle, MapPin, Plane, Repeat2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MultiStopFields } from "@/components/multi-stop-fields";
import { intermediateStopsInputSchema, type IntermediateStopInput } from "@/lib/booking-stops";
import { fetchBookingWithIdempotency } from "@/lib/booking-submit";
import {
  canonicalLocationKey,
  canonicalLocationLabel,
  locationMatchesQuery,
  normalizeSearch,
  resolveLocationAlias,
} from "@/lib/location-search";
import {
  HO_CHI_MINH_CANONICAL_NAME,
  HO_CHI_MINH_PUBLIC_LABEL,
  getPublicLocationLabel,
} from "@/lib/public-location-label";
import {
  routeComboHref,
  routeHref,
  vehicleTypeSlug,
  type Route,
  type RoutePricingDirectionKey,
} from "@/types/route";

type BookingSearchVariant = "default" | "hero" | "compact";
export type BookingSearchMode = "standard" | "airport";
type AirportTransferDirection = "pickup" | "dropoff";
type BookingTripType = "one_way" | "round_trip";

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
  initialMode?: BookingSearchMode;
  source?: string;
};

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

function airportDirectionLabel(value: AirportTransferDirection) {
  return value === "pickup" ? "Đón sân bay" : "Đi sân bay";
}

function supportsDirection(route: Route, direction: RoutePricingDirectionKey) {
  if (!route.pricingV2) return direction === "outbound";
  return route.pricingV2[direction].enabled;
}

function findJourney(routes: Route[], pickup: string, destination: string): BookingJourney | undefined {
  const normalizedPickup = canonicalLocationKey(pickup);
  const normalizedDestination = canonicalLocationKey(destination);
  if (!normalizedPickup || !normalizedDestination || normalizedPickup === normalizedDestination) return undefined;

  for (const route of routes) {
    const routeFrom = canonicalLocationKey(route.from);
    const routeTo = canonicalLocationKey(route.to);

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
    for (const rawLocation of [route.from, route.to]) {
      const label = canonicalLocationLabel(rawLocation);
      values.set(canonicalLocationKey(label), getPublicLocationLabel(label));
    }
  }

  return Array.from(values.values()).sort((a, b) => a.localeCompare(b, "vi"));
}

function uniqueAirportLocations(routes: Route[]) {
  const values = new Map<string, string>();

  for (const route of routes) {
    if (route.originLocation?.type === "airport") {
      const label = canonicalLocationLabel(route.from);
      values.set(canonicalLocationKey(label), getPublicLocationLabel(label));
    }
    if (route.destinationLocation?.type === "airport") {
      const label = canonicalLocationLabel(route.to);
      values.set(canonicalLocationKey(label), getPublicLocationLabel(label));
    }
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
  const inputId = `${listId}-input`;
  const suggestionsId = `${listId}-suggestions`;
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const aliasResolution = useMemo(() => resolveLocationAlias(value), [value]);

  const suggestions = useMemo(() => {
    const query = normalizeSearch(value);
    const filtered = query
      ? options.filter((option) => locationMatchesQuery(option, value))
      : options;
    return filtered.slice(0, 8);
  }, [options, value]);

  function selectSuggestion(option: string) {
    onChange(
      aliasResolution && canonicalLocationKey(option) === aliasResolution.canonicalKey
        ? value.trim()
        : option,
    );
    setSuggestionsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!suggestions.length) return;
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      if (!suggestions.length) return;
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }
    if (event.key === "Enter" && suggestionsOpen && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showSuggestions = suggestionsOpen && suggestions.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative">
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-primary"
          size={18}
        />
        <input
          id={inputId}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setSuggestionsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => window.setTimeout(() => {
            setSuggestionsOpen(false);
            setActiveIndex(-1);
          }, 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={suggestionsId}
          aria-activedescendant={activeIndex >= 0 ? `${suggestionsId}-${activeIndex}` : undefined}
          className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base font-medium text-foreground outline-none transition placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
          required
        />

        {showSuggestions && (
          <div
            id={suggestionsId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1.5 text-foreground shadow-lg"
          >
            {suggestions.map((option, index) => (
              <button
                id={`${suggestionsId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                key={option}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(option)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${index === activeIndex ? "bg-secondary text-foreground" : "hover:bg-muted"}`}
              >
                <MapPin aria-hidden="true" size={15} className="shrink-0 text-primary" />
                {aliasResolution && canonicalLocationKey(option) === aliasResolution.canonicalKey ? (
                  <span className="min-w-0">
                    <span className="block font-semibold">{aliasResolution.displayLabel}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {getPublicLocationLabel(aliasResolution.canonical)} · Áp dụng giá tuyến {HO_CHI_MINH_PUBLIC_LABEL}
                    </span>
                  </span>
                ) : <span>{option}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {aliasResolution && (
        <p className="m-0 flex items-start gap-1.5 text-xs font-medium leading-5 text-primary" role="status">
          <span aria-hidden="true">✓</span>
          <span>Đã quy đổi về {getPublicLocationLabel(aliasResolution.canonical)} · Áp dụng giá tuyến {HO_CHI_MINH_PUBLIC_LABEL}</span>
        </p>
      )}
    </div>
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
  searchMode,
  airportDirection,
  onClose,
}: {
  pickup: string;
  destination: string;
  departureDate: string;
  tripType: BookingTripType;
  vehicleType: string;
  journey?: BookingJourney;
  source: string;
  searchMode: BookingSearchMode;
  airportDirection?: AirportTransferDirection;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [intermediateStops, setIntermediateStops] = useState<IntermediateStopInput[]>([]);
  const [intermediateStopErrors, setIntermediateStopErrors] = useState<MultiStopFieldsError[]>([]);
  const [pickupAddressError, setPickupAddressError] = useState("");
  const [dropoffAddressError, setDropoffAddressError] = useState("");
  const [pickupNoteError, setPickupNoteError] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const visibleVehicle = !vehicleType || vehicleType === CONSULT_VEHICLE
    ? CONSULT_VEHICLE_LABEL
    : vehicleType;
  const bookingVehicle = !vehicleType || vehicleType === CONSULT_VEHICLE
    ? BOOKING_VEHICLE_FALLBACK
    : vehicleType;
  const visibleDepartureDate = departureDate ? formatDateLabel(departureDate) : "Chưa chọn";
  const routeLabel = `${pickup.trim()} – ${destination.trim()}`;
  const isPickupFromAirport = searchMode === "airport" && airportDirection === "pickup";
  const isDropoffAtAirport = searchMode === "airport" && airportDirection === "dropoff";
  const fixedAirportName = isPickupFromAirport ? pickup.trim() : isDropoffAtAirport ? destination.trim() : "";

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
    setPickupAddressError("");
    setDropoffAddressError("");
    setPickupNoteError("");
    setIntermediateStopErrors([]);

    const normalizedPickupAddress = pickupAddress.trim();
    const normalizedDropoffAddress = dropoffAddress.trim();
    const normalizedPickupNote = pickupNote.trim();

    if (!fullName.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    if (!phoneRegex.test(phone.trim().replace(/\s+/g, ""))) {
      setError("Số điện thoại chưa đúng định dạng Việt Nam.");
      return;
    }
    let hasAddressError = false;
    if (!isPickupFromAirport && !normalizedPickupAddress) {
      setPickupAddressError("Vui lòng nhập điểm đón cụ thể.");
      hasAddressError = true;
    } else if (normalizedPickupAddress.length > 240) {
      setPickupAddressError("Điểm đón tối đa 240 ký tự.");
      hasAddressError = true;
    }
    if (!isDropoffAtAirport && !normalizedDropoffAddress) {
      setDropoffAddressError("Vui lòng nhập điểm trả cụ thể.");
      hasAddressError = true;
    } else if (normalizedDropoffAddress.length > 240) {
      setDropoffAddressError("Điểm trả tối đa 240 ký tự.");
      hasAddressError = true;
    }
    if (normalizedPickupNote.length > 300) {
      setPickupNoteError("Lưu ý điểm đón tối đa 300 ký tự.");
      hasAddressError = true;
    }
    const parsedStops = intermediateStopsInputSchema.safeParse(intermediateStops);
    if (!parsedStops.success) {
      const nextErrors: MultiStopFieldsError[] = [];
      for (const issue of parsedStops.error.issues) {
        const index = typeof issue.path[0] === "number" ? issue.path[0] : -1;
        const field = issue.path[1];
        if (index < 0 || (field !== "address" && field !== "waitingMinutes")) continue;
        nextErrors[index] ??= {};
        nextErrors[index][field] = { message: issue.message };
      }
      setIntermediateStopErrors(nextErrors);
      hasAddressError = true;
    }
    if (hasAddressError || !parsedStops.success) return;

    setIsSubmitting(true);
    try {
      const noteParts = [
        journey ? "Yêu cầu báo giá từ Booking Search." : "Custom Journey: chưa có Route canonical phù hợp tại thời điểm gửi.",
        `Loại chuyến: ${tripTypeLabel(tripType)}.`,
        `Nguồn: ${source}.`,
      ];
      if (searchMode === "airport" && airportDirection) {
        noteParts.push(`Dịch vụ sân bay: ${airportDirectionLabel(airportDirection)}.`);
      }
      if (!vehicleType || vehicleType === CONSULT_VEHICLE) noteParts.push("Khách cần tư vấn loại xe phù hợp.");

      const response = await fetchBookingWithIdempotency("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim().replace(/\s+/g, ""),
          route: routeLabel,
          routeId: journey?.route.id,
          vehicleType: bookingVehicle,
          departureDate,
          pickupAddress: normalizedPickupAddress,
          dropoffAddress: normalizedDropoffAddress,
          pickupNote: normalizedPickupNote,
          intermediateStops: parsedStops.data,
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
            <h3>Cảm ơn bạn. Alo Đặt Xe sẽ liên hệ để báo giá.</h3>
            <p className="m-0 text-sm leading-6 text-muted-foreground">
              Hành trình {pickup} → {destination}, {visibleDepartureDate}, {visibleVehicle} đã được ghi nhận.
            </p>
            <Button type="button" onClick={onClose}>Đóng</Button>
          </div>
        ) : (
          <>
            <p className="section-label">YÊU CẦU BÁO GIÁ</p>
            <h3>Xác nhận nhu cầu chuyến xe.</h3>
            <div className="quick-booking-summary">
              <div>Tuyến: <strong>{pickup} → {destination}</strong></div>
              {searchMode === "airport" && airportDirection && (
                <div>Dịch vụ: <strong>{airportDirectionLabel(airportDirection)}</strong></div>
              )}
              <div>Ngày đi: <strong>{visibleDepartureDate}</strong></div>
              <div>Loại chuyến: <strong>{tripTypeLabel(tripType)}</strong></div>
              <div>Loại xe: <strong>{visibleVehicle}</strong></div>
              <div>Giá: <strong>Alo Đặt Xe xác nhận theo hành trình thực tế</strong></div>
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
              {isPickupFromAirport ? (
                <div className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                  <span>Điểm đón</span>
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/60 px-3.5 py-3" role="status">
                    <Plane aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                      <span className="block">{fixedAirportName}</span>
                      <span className="block text-xs font-normal text-muted-foreground">Đã xác định theo tuyến đã chọn</span>
                    </span>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                  <span>Điểm đón cụ thể <span className="text-destructive">*</span></span>
                  <input
                    value={pickupAddress}
                    onChange={(event) => {
                      setPickupAddress(event.target.value);
                      if (pickupAddressError) setPickupAddressError("");
                    }}
                    maxLength={240}
                    className="form-control"
                    placeholder="Số nhà, tên đường, phường/xã..."
                    aria-invalid={!!pickupAddressError}
                  />
                  {pickupAddressError && <p className="m-0 text-sm text-destructive" role="alert">{pickupAddressError}</p>}
                </label>
              )}
              {isDropoffAtAirport ? (
                <div className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                  <span>Điểm trả</span>
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/60 px-3.5 py-3" role="status">
                    <Plane aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                      <span className="block">{fixedAirportName}</span>
                      <span className="block text-xs font-normal text-muted-foreground">Đã xác định theo tuyến đã chọn</span>
                    </span>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                  <span>Điểm trả cụ thể <span className="text-destructive">*</span></span>
                  <input
                    value={dropoffAddress}
                    onChange={(event) => {
                      setDropoffAddress(event.target.value);
                      if (dropoffAddressError) setDropoffAddressError("");
                    }}
                    maxLength={240}
                    className="form-control"
                    placeholder="Số nhà, tên đường, phường/xã..."
                    aria-invalid={!!dropoffAddressError}
                  />
                  {dropoffAddressError && <p className="m-0 text-sm text-destructive" role="alert">{dropoffAddressError}</p>}
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                <span>Lưu ý điểm đón <span className="font-normal text-muted-foreground">(không bắt buộc)</span></span>
                <textarea
                  value={pickupNote}
                  onChange={(event) => {
                    setPickupNote(event.target.value);
                    if (pickupNoteError) setPickupNoteError("");
                  }}
                  maxLength={300}
                  className="form-control min-h-24 resize-y"
                  placeholder="Cổng, sảnh, mốc nhận diện hoặc hướng dẫn đón..."
                  aria-invalid={!!pickupNoteError}
                />
                {pickupNoteError && <p className="m-0 text-sm text-destructive" role="alert">{pickupNoteError}</p>}
              </label>
              <MultiStopFields
                stops={intermediateStops}
                onChange={(stops) => {
                  setIntermediateStops(stops);
                  if (intermediateStopErrors.length) setIntermediateStopErrors([]);
                }}
                errors={intermediateStopErrors}
              />
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

type MultiStopFieldsError = {
  address?: { message?: string };
  waitingMinutes?: { message?: string };
};

/**
 * Entry point chung cho booking funnel.
 * Hai tab chỉ thay đổi cách nhập hành trình; cả chuyến thường và sân bay đều dùng chung
 * Route resolver, Pricing V2 và Custom Journey fallback.
 */
export function BookingSearchForm({
  routes,
  id,
  variant = "default",
  initialPickup = "",
  initialDestination = "",
  initialMode = "standard",
  source,
}: BookingSearchFormProps) {
  const router = useRouter();
  const instanceId = useId();
  const pickupListId = `${instanceId}-pickup`;
  const destinationListId = `${instanceId}-destination`;
  const airportPlaceListId = `${instanceId}-airport-place`;
  const headingId = `${instanceId}-title`;
  const searchPanelId = `${instanceId}-search-panel`;

  const locations = useMemo(() => uniqueLocations(routes), [routes]);
  const airportLocations = useMemo(() => uniqueAirportLocations(routes), [routes]);
  const airportLocationKeys = useMemo(
    () => new Set(airportLocations.map((location) => canonicalLocationKey(location))),
    [airportLocations],
  );
  const nonAirportLocations = useMemo(
    () => locations.filter((location) => !airportLocationKeys.has(canonicalLocationKey(location))),
    [airportLocationKeys, locations],
  );
  const globalVehicleTypes = useMemo(() => uniqueVehicleTypes(routes), [routes]);

  const initialPickupIsAirport = airportLocationKeys.has(canonicalLocationKey(initialPickup));
  const initialDestinationIsAirport = airportLocationKeys.has(canonicalLocationKey(initialDestination));
  const inferredInitialMode = initialMode === "airport" || initialPickupIsAirport || initialDestinationIsAirport
    ? "airport"
    : "standard";
  const inferredAirportDirection: AirportTransferDirection = initialPickupIsAirport ? "pickup" : "dropoff";

  const [searchMode, setSearchMode] = useState<BookingSearchMode>(inferredInitialMode);
  const [standardPickup, setStandardPickup] = useState(inferredInitialMode === "standard" ? initialPickup : "");
  const [standardDestination, setStandardDestination] = useState(inferredInitialMode === "standard" ? initialDestination : "");
  const [airportDirection, setAirportDirection] = useState<AirportTransferDirection>(inferredAirportDirection);
  const [selectedAirport, setSelectedAirport] = useState(
    inferredInitialMode === "airport"
      ? initialPickupIsAirport
        ? initialPickup
        : initialDestinationIsAirport
          ? initialDestination
          : ""
      : "",
  );
  const [airportPlace, setAirportPlace] = useState(
    inferredInitialMode === "airport"
      ? initialPickupIsAirport
        ? initialDestination
        : initialPickup
      : "",
  );
  const [departureDate, setDepartureDate] = useState("");
  const [tripType, setTripType] = useState<BookingTripType>("one_way");
  const [vehicleType, setVehicleType] = useState("");
  const [error, setError] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [swapRotation, setSwapRotation] = useState(0);

  const pickup = searchMode === "airport"
    ? airportDirection === "pickup" ? selectedAirport : airportPlace
    : standardPickup;
  const destination = searchMode === "airport"
    ? airportDirection === "pickup" ? airportPlace : selectedAirport
    : standardDestination;

  const journey = useMemo(() => findJourney(routes, pickup, destination), [routes, pickup, destination]);
  const availableVehicleTypes = useMemo(
    () => (journey ? vehicleTypesForJourney(journey) : globalVehicleTypes),
    [globalVehicleTypes, journey],
  );
  const sourceBase = source || (variant === "hero" ? "homepage_hero" : `booking_search_${variant}`);
  const resolvedSource = `${sourceBase}_${searchMode}`;
  const isCompact = variant === "compact";
  const needsQuote = Boolean(pickup.trim() && destination.trim() && !journey);

  function resetJourneyDependentFields() {
    setVehicleType("");
    setError("");
  }

  function changeSearchMode(mode: BookingSearchMode) {
    setSearchMode(mode);
    resetJourneyDependentFields();
  }

  function swapJourneyEndpoints() {
    if (searchMode === "airport") {
      setAirportDirection((current) => current === "pickup" ? "dropoff" : "pickup");
    } else {
      setStandardPickup(standardDestination);
      setStandardDestination(standardPickup);
    }
    setSwapRotation((current) => current + 180);
    resetJourneyDependentFields();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (searchMode === "airport" && !selectedAirport) {
      setError("Vui lòng chọn sân bay.");
      return;
    }
    if (!pickup.trim() || !destination.trim()) {
      setError(searchMode === "airport" ? "Vui lòng nhập địa điểm còn lại của chuyến sân bay." : "Vui lòng chọn đầy đủ điểm đón và điểm đến.");
      return;
    }
    if (canonicalLocationKey(pickup) === canonicalLocationKey(destination)) {
      const canonicalKey = canonicalLocationKey(pickup);
      if (canonicalKey === canonicalLocationKey(HO_CHI_MINH_CANONICAL_NAME)) {
        setError(`Hai điểm này đều thuộc nhóm giá ${HO_CHI_MINH_PUBLIC_LABEL}. Vui lòng chọn điểm đến ngoài ${HO_CHI_MINH_PUBLIC_LABEL} hoặc liên hệ để được tư vấn chuyến nội thành.`);
      } else {
        setError("Điểm đón và điểm đến phải khác nhau.");
      }
      return;
    }
    if (departureDate && departureDate < localDateIso(new Date())) {
      setError("Ngày đi không thể nằm trong quá khứ.");
      return;
    }

    if (!journey) {
      setQuoteOpen(true);
      return;
    }

    const params = new URLSearchParams({
      direction: journey.direction,
      trip_type: tripType,
      source: resolvedSource,
      search_mode: searchMode,
    });
    if (departureDate) params.set("ngay_di", departureDate);
    if (searchMode === "airport") params.set("airport_direction", airportDirection);
    if (vehicleType && vehicleType !== CONSULT_VEHICLE) params.set("vehicle_type", vehicleType);

    const selectedVehicleSlug = vehicleType && vehicleType !== CONSULT_VEHICLE
      ? vehicleTypeSlug(vehicleType)
      : "";
    const targetPath = selectedVehicleSlug
      ? routeComboHref(journey.route, selectedVehicleSlug)
      : routeHref(journey.route);
    const targetHash = selectedVehicleSlug ? "#booking" : "#pricing";

    router.push(`${targetPath}?${params.toString()}${targetHash}`);
  }

  const outerClass = variant === "hero" || isCompact ? "w-full" : "section-wrap";
  const panelClass = isCompact
    ? "rounded-2xl border border-border bg-card p-4"
    : variant === "hero"
      ? "rounded-[28px] border border-border bg-card/95 p-5 text-foreground shadow-[0_22px_70px_rgba(11,79,75,0.16)] backdrop-blur sm:p-6"
      : "rounded-[28px] border border-border bg-card p-5 text-foreground sm:p-6";
  const fieldsClass = isCompact ? "grid gap-3 md:grid-cols-2 xl:grid-cols-5" : "grid gap-3 sm:grid-cols-2";
  const helperText = searchMode === "airport"
    ? !selectedAirport
      ? "Chọn sân bay và chiều di chuyển. Hệ thống sẽ ưu tiên bảng giá sân bay hiện có; tuyến chưa có giá vẫn nhận báo giá riêng."
      : pickup.trim() && destination.trim() && !journey
        ? "Chưa có bảng giá sẵn cho chuyến sân bay này. Bạn vẫn có thể chọn xe và gửi yêu cầu báo giá ngay."
        : journey
          ? "Đã nhận diện tuyến sân bay có dữ liệu. Loại xe được lọc theo đúng chiều di chuyển và Pricing V2 hiện có."
          : "Nhập địa điểm còn lại để kiểm tra giá cho chuyến sân bay."
    : pickup.trim() && destination.trim() && !journey
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
              Chọn chuyến đi tỉnh hoặc chế độ đưa đón sân bay. Cả hai đều dùng chung hệ thống giá và yêu cầu báo giá của Alo Đặt Xe.
            </p>
          </div>
        )}

        {isCompact && <h2 id={headingId} className="sr-only">Tìm chuyến xe</h2>}

        <div
          className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1"
          role="tablist"
          aria-label="Loại hành trình"
        >
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === "standard"}
            aria-controls={searchPanelId}
            onClick={() => changeSearchMode("standard")}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${searchMode === "standard" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Đi tỉnh / Thuê xe
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={searchMode === "airport"}
            aria-controls={searchPanelId}
            onClick={() => changeSearchMode("airport")}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${searchMode === "airport" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Plane size={16} aria-hidden="true" />
            Đưa đón sân bay
          </button>
        </div>

        <div id={searchPanelId} role="tabpanel">
          {searchMode === "airport" && (
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1.5" aria-label="Chiều chuyến sân bay">
              <button
                type="button"
                onClick={() => {
                  setAirportDirection("pickup");
                  resetJourneyDependentFields();
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${airportDirection === "pickup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Đón sân bay
              </button>
              <button
                type="button"
                onClick={() => {
                  setAirportDirection("dropoff");
                  resetJourneyDependentFields();
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${airportDirection === "dropoff" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Đi sân bay
              </button>
            </div>
          )}

          <div className={fieldsClass}>
            <div className="relative grid gap-3 sm:col-span-2 sm:grid-cols-2 sm:gap-3 xl:col-span-2">
              {searchMode === "standard" ? (
                <>
                  <LocationField
                    label="Điểm đón"
                    value={standardPickup}
                    onChange={(value) => {
                      setStandardPickup(value);
                      resetJourneyDependentFields();
                    }}
                    placeholder="Ví dụ: Biên Hòa"
                    listId={pickupListId}
                    options={nonAirportLocations}
                  />

                  <button
                    type="button"
                    onClick={swapJourneyEndpoints}
                    aria-label="Đổi chiều điểm đón và điểm đến"
                    title="Đổi chiều điểm đón và điểm đến"
                    className="absolute right-3 top-[calc(50%+15px)] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-transparent text-primary transition hover:text-primary/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:left-1/2 sm:right-auto sm:top-[3.4rem] sm:-translate-x-1/2"
                  >
                    <ArrowRightLeft
                      aria-hidden="true"
                      size={20}
                      className="transition-transform duration-300 ease-out sm:hidden"
                      style={{ transform: `rotate(${90 + swapRotation}deg)` }}
                    />
                    <ArrowRightLeft
                      aria-hidden="true"
                      size={20}
                      className="hidden transition-transform duration-300 ease-out sm:block"
                      style={{ transform: `rotate(${swapRotation}deg)` }}
                    />
                  </button>

                  <LocationField
                    label="Điểm đến"
                    value={standardDestination}
                    onChange={(value) => {
                      setStandardDestination(value);
                      resetJourneyDependentFields();
                    }}
                    placeholder="Ví dụ: Cần Thơ"
                    listId={destinationListId}
                    options={nonAirportLocations}
                  />
                </>
              ) : (
                <>
                  <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground">
                    <span>{airportDirection === "pickup" ? "Điểm đón · Sân bay" : "Điểm đến · Sân bay"}</span>
                    <span className="relative block">
                      <Plane
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
                        size={18}
                      />
                      <select
                        value={selectedAirport}
                        onChange={(event) => {
                          setSelectedAirport(event.target.value);
                          resetJourneyDependentFields();
                        }}
                        className="h-12 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-8 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        required
                      >
                        <option value="">Chọn sân bay</option>
                        {airportLocations.map((airport) => (
                          <option key={airport} value={airport}>{airport}</option>
                        ))}
                      </select>
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={swapJourneyEndpoints}
                    aria-label="Đổi chiều điểm đón và điểm đến"
                    title="Đổi chiều điểm đón và điểm đến"
                    className="absolute right-3 top-[calc(50%+15px)] z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-transparent text-primary transition hover:text-primary/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:left-1/2 sm:right-auto sm:top-[3.4rem] sm:-translate-x-1/2"
                  >
                    <ArrowRightLeft
                      aria-hidden="true"
                      size={20}
                      className="transition-transform duration-300 ease-out sm:hidden"
                      style={{ transform: `rotate(${90 + swapRotation}deg)` }}
                    />
                    <ArrowRightLeft
                      aria-hidden="true"
                      size={20}
                      className="hidden transition-transform duration-300 ease-out sm:block"
                      style={{ transform: `rotate(${swapRotation}deg)` }}
                    />
                  </button>

                  <LocationField
                    label={airportDirection === "pickup" ? "Điểm đến" : "Điểm đón"}
                    value={airportPlace}
                    onChange={(value) => {
                      setAirportPlace(value);
                      resetJourneyDependentFields();
                    }}
                    placeholder={airportDirection === "pickup" ? "Ví dụ: Vũng Tàu" : "Ví dụ: Biên Hòa"}
                    listId={airportPlaceListId}
                    options={nonAirportLocations}
                  />
                </>
              )}
            </div>

            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground">
              <span>Ngày đi <span className="font-normal text-muted-foreground">(không bắt buộc)</span></span>
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
              <span>Loại xe <span className="font-normal text-muted-foreground">(không bắt buộc)</span></span>
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
                >
                  <option value="">Chưa chọn loại xe</option>
                  {availableVehicleTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value={CONSULT_VEHICLE}>{CONSULT_VEHICLE_LABEL}</option>
                </select>
              </span>
            </label>
          </div>
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
          searchMode={searchMode}
          airportDirection={searchMode === "airport" ? airportDirection : undefined}
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
