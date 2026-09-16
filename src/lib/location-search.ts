export type LocationAliasGroup = {
  canonical: string;
  aliases: string[];
};

export function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const LOCATION_SEARCH_ALIASES: LocationAliasGroup[] = [
  {
    canonical: "TP. Hồ Chí Minh",
    aliases: [
      "Sài Gòn",
      "Sai Gon",
      "Saigon",
      "HCM",
      "TP HCM",
      "TPHCM",
      "TP. HCM",
      "Hồ Chí Minh",
      "Ho Chi Minh",
      "TP Hồ Chí Minh",
      "TP. Hồ Chí Minh",
      "Thành phố Hồ Chí Minh",
    ],
  },
];

const normalizedAliasGroups = LOCATION_SEARCH_ALIASES.map((group) => {
  const terms = Array.from(
    new Set([group.canonical, ...group.aliases].map((value) => normalizeSearch(value)).filter(Boolean)),
  );

  return {
    canonical: group.canonical,
    canonicalKey: normalizeSearch(group.canonical),
    terms,
  };
});

function aliasGroupForValue(value: string) {
  const normalizedValue = normalizeSearch(value);
  if (!normalizedValue) return undefined;
  return normalizedAliasGroups.find((group) => group.terms.includes(normalizedValue));
}

export function canonicalLocationLabel(value: string) {
  return aliasGroupForValue(value)?.canonical ?? value.trim();
}

export function canonicalLocationKey(value: string) {
  const normalizedValue = normalizeSearch(value);
  if (!normalizedValue) return "";
  return aliasGroupForValue(value)?.canonicalKey ?? normalizedValue;
}

export function locationSearchTerms(value: string) {
  const normalizedValue = normalizeSearch(value);
  if (!normalizedValue) return [];

  const aliasGroup = aliasGroupForValue(value);
  return aliasGroup ? aliasGroup.terms : [normalizedValue];
}

export function locationMatchesQuery(location: string | null | undefined, query: string) {
  if (!location) return false;

  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const locationTerms = locationSearchTerms(location);
  const queryAliasGroup = normalizedAliasGroups.find((group) =>
    group.terms.some((term) => term === normalizedQuery),
  );

  if (queryAliasGroup) {
    return locationTerms.some(
      (locationTerm) =>
        queryAliasGroup.terms.includes(locationTerm) || locationTerm === queryAliasGroup.canonicalKey,
    );
  }

  return locationTerms.some((term) => term.includes(normalizedQuery));
}
