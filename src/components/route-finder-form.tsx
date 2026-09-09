"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routeComboHref, routeHref, vehicleTypeSlug, type Route } from "@/types/route";

type RouteFinderFormProps = {
  routes: Route[];
  id?: string;
};

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

/**
 * Tìm đúng một route trước rồi mới cho chọn loại xe.
 * Như vậy dropdown xe luôn lấy từ pricingByVehicle của route đã chọn,
 * và submit có thể dựng URL canonical ngay tại đây.
 */
export function RouteFinderForm({ routes, id }: RouteFinderFormProps) {
  const [destinationQuery, setDestinationQuery] = useState("");
  const [selectedRouteSlug, setSelectedRouteSlug] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.slug === selectedRouteSlug),
    [routes, selectedRouteSlug],
  );

  const suggestions = useMemo(() => {
    const query = normalizeSearch(destinationQuery);
    if (!query || selectedRoute) return [];

    return routes
      .filter((route) => {
        const destination = normalizeSearch(route.to);
        const routeLabel = normalizeSearch(`${route.from} ${route.to}`);
        return destination.includes(query) || routeLabel.includes(query);
      })
      .slice(0, 8);
  }, [destinationQuery, routes, selectedRoute]);

  function handleDestinationChange(value: string) {
    setDestinationQuery(value);
    setSelectedRouteSlug("");
    setVehicleType("");
    setSuggestionsOpen(true);
  }

  function selectRoute(route: Route) {
    setDestinationQuery(route.to);
    setSelectedRouteSlug(route.slug);
    setVehicleType("");
    setSuggestionsOpen(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoute) return;

    const href = vehicleType
      ? routeComboHref(selectedRoute, vehicleTypeSlug(vehicleType))
      : routeHref(selectedRoute);

    window.location.href = href;
  }

  const availableVehicleTypes = selectedRoute
    ? selectedRoute.pricingByVehicle.map((price) => price.vehicleType)
    : [];

  return (
    <section className="route-finder" id={id} aria-labelledby="route-finder-title">
      <form className="route-finder-form" onSubmit={handleSubmit}>
        <div className="route-finder-heading">
          <p className="section-label">TÌM TUYẾN PHÙ HỢP</p>
          <h2 id="route-finder-title">Bạn muốn đi đâu?</h2>
        </div>
        <div className="route-finder-fields">
          <label className="route-select-field route-combobox">
            <span>Điểm đến</span>
            <input
              value={destinationQuery}
              onChange={(event) => handleDestinationChange(event.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
              placeholder="Ví dụ: Bến Cát"
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls="route-finder-suggestions"
              required
              className="route-input"
            />
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="route-suggestions" id="route-finder-suggestions" role="listbox">
                {suggestions.map((route) => (
                  <button
                    type="button"
                    role="option"
                    className="route-suggestion"
                    key={route.slug}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectRoute(route)}
                  >
                    <strong>{route.to}</strong>
                    <span>{route.from} → {route.to}</span>
                  </button>
                ))}
              </div>
            )}
          </label>

          <label className="route-select-field">
            <span>Loại xe</span>
            <select
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value)}
              disabled={!selectedRoute}
              className="route-input"
            >
              <option value="">{selectedRoute ? "Tất cả loại xe" : "Chọn điểm đến trước"}</option>
              {availableVehicleTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <Button size="lg" type="submit" disabled={!selectedRoute}>
            Tìm tuyến <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </form>
    </section>
  );
}
