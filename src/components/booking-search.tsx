import "server-only";
import { BookingSearchForm, type BookingSearchFormProps } from "@/components/route-finder-form";
import { projectBookingSearchRoutes } from "@/lib/booking-search-routes";
import type { Route } from "@/types/route";

/** Keep CMS/editorial/pricing payloads on the server when only route search is needed. */
export function RouteFinderForm({ routes, ...props }: Omit<BookingSearchFormProps, "routes"> & { routes: Route[] }) {
  return <BookingSearchForm {...props} routes={projectBookingSearchRoutes(routes)} />;
}
