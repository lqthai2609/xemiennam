"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Repeat2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { routeHref, type Route, type RoutePricingDirectionKey } from "@/types/route";

type BookingSearchVariant = "default" | "hero" | "compact";
type BookingTripType = "one_way" | "round_trip";

type BookingJourney = {
  route: Route;
  direction: RoutePricingDirectionKey;
};

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
    if (supportsDirection(route, "outbound")) {
      values.set(normalizeSearch(route.from), route.from);
      values.set(normalizeSearch(route.to), route.to);
    }
    if (supportsDirection(route, "inbound")) {
      values.set(normalizeSearch(route.to), route.to);
      values.set(normalizeSearch(route.from), route.from);
    }
  }

  return Array.from(values.values()).sort((a, b) => a.localeCompare(b, "vi"));
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

/**
 * Entry point chung cho booking funnel.
 * Chỉ resolve Route + direction từ dữ liệu route hiện có; không tạo pricing logic riêng.
 * Ngày đi và loại chuyến được giữ trong query string để các bước sau có thể tiếp tục dùng.
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
  const [error, setError] = useState("");

  const locations = useMemo(() => uniqueLocations(routes), [routes]);
  const journey = useMemo(() => findJourney(routes, pickup, destination), [routes, pickup, destination]);
  const resolvedSource = source || (variant === "hero" ? "homepage_hero" : `booking_search_${variant}`);
  const isCompact = variant === "compact";

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
    if (!journey) {
      setError("Chưa tìm thấy tuyến phù hợp với hai địa điểm này. Bạn có thể gửi yêu cầu để Gocar VN tư vấn riêng.");
      return;
    }

    const params = new URLSearchParams({
      direction: journey.direction,
      ngay_di: departureDate,
      trip_type: tripType,
      source: resolvedSource,
    });

    window.location.assign(`${routeHref(journey.route)}?${params.toString()}#pricing`);
  }

  const contactHref =
    pickup.trim() && destination.trim()
      ? `/lien-he?tuyen=${encodeURIComponent(`${pickup.trim()} → ${destination.trim()}`)}`
      : "/lien-he";

  const outerClass = variant === "hero" || isCompact ? "w-full" : "section-wrap";
  const panelClass = isCompact
    ? "rounded-2xl border border-border bg-card p-4"
    : variant === "hero"
      ? "rounded-[28px] border border-border bg-card/95 p-5 text-foreground shadow-[0_22px_70px_rgba(11,79,75,0.16)] backdrop-blur sm:p-6"
      : "rounded-[28px] border border-border bg-card p-5 text-foreground sm:p-6";
  const fieldsClass = isCompact ? "grid gap-3 md:grid-cols-2 xl:grid-cols-4" : "grid gap-3 sm:grid-cols-2";

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
              Chọn hành trình và ngày đi để xem đúng giá theo tuyến, chiều di chuyển và gói dịch vụ hiện có.
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
              setError("");
            }}
            placeholder="Ví dụ: TP. Hồ Chí Minh"
            listId={pickupListId}
            options={locations}
          />

          <LocationField
            label="Điểm đến"
            value={destination}
            onChange={(value) => {
              setDestination(value);
              setError("");
            }}
            placeholder="Ví dụ: Vũng Tàu"
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
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Button size="lg" type="submit" className="w-full">
            Xem giá chuyến xe <ArrowRight data-icon="inline-end" />
          </Button>

          <div className="min-h-5 text-sm" aria-live="polite">
            {error ? (
              <p className="text-destructive">
                {error}{" "}
                {pickup.trim() && destination.trim() ? (
                  <Link href={contactHref} className="font-semibold underline underline-offset-4">
                    Yêu cầu tư vấn
                  </Link>
                ) : null}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Giá được lấy từ dữ liệu tuyến hiện có; không tự tạo giá cho hành trình chưa được cấu hình.
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

/** Giữ tên cũ để các trang đang dùng RouteFinderForm không bị breaking change. */
export function RouteFinderForm(props: BookingSearchFormProps) {
  return <BookingSearchForm {...props} />;
}
