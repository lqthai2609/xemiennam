export interface Route {
  id: string;
  from: string;
  to: string;
  time: string;
  distance: string;
  price: string;
  vehicleTypes: string[];
  region: string;
  seatCount: string[];
}

export interface FilterState {
  region: string;
  vehicleType: string;
  seats: string;
}

export const emptyFilters: FilterState = {
  region: "",
  vehicleType: "",
  seats: "",
};

export function hasActiveFilters(filters: FilterState) {
  return Boolean(filters.region || filters.vehicleType || filters.seats);
}
