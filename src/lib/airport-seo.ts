export function airportShortName(name: string): string {
  const normalized = name.trim().replace(/^sân bay\s+/i, "").trim();
  return normalized || name.trim();
}

export function airportDisplayName(name: string): string {
  const shortName = airportShortName(name);
  return shortName ? `Sân bay ${shortName}` : "Sân bay";
}

export function airportPublicSlug(locationSlug: string): string {
  return locationSlug.replace(/^san-bay-/, "");
}

export function airportHubHref(locationSlug: string): string {
  return `/san-bay/${airportPublicSlug(locationSlug)}`;
}
