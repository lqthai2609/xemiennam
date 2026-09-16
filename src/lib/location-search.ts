export type LocationAliasGroup = {
  canonical: string;
  aliases: Array<string | { value: string; label: string }>;
};

export type LocationAliasResolution = {
  rawInput: string;
  matchedAlias: string;
  displayLabel: string;
  canonical: string;
  canonicalKey: string;
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
      ...Array.from({ length: 12 }, (_, index) => {
        const district = index + 1;
        return [
          { value: `q${district}`, label: `Quận ${district}` },
          { value: `q ${district}`, label: `Quận ${district}` },
          { value: `q.${district}`, label: `Quận ${district}` },
          { value: `q. ${district}`, label: `Quận ${district}` },
          { value: `quan ${district}`, label: `Quận ${district}` },
          { value: `quận ${district}`, label: `Quận ${district}` },
        ];
      }).flat(),
      { value: "tan binh", label: "Tân Bình" },
      { value: "tân bình", label: "Tân Bình" },
      { value: "phu nhuan", label: "Phú Nhuận" },
      { value: "phú nhuận", label: "Phú Nhuận" },
      { value: "thu duc", label: "Thủ Đức" },
      { value: "thủ đức", label: "Thủ Đức" },
      { value: "binh thanh", label: "Bình Thạnh" },
      { value: "bình thạnh", label: "Bình Thạnh" },
      { value: "binh chanh", label: "Bình Chánh" },
      { value: "bình chánh", label: "Bình Chánh" },
      { value: "binh tan", label: "Bình Tân" },
      { value: "bình tân", label: "Bình Tân" },
    ],
  },
];

const normalizedAliasGroups = LOCATION_SEARCH_ALIASES.map((group) => {
  const aliasEntries = group.aliases.map((alias) =>
    typeof alias === "string" ? { value: alias, label: alias } : alias,
  );
  const terms = Array.from(
    new Set([group.canonical, ...aliasEntries.map((alias) => alias.value)].map((value) => normalizeSearch(value)).filter(Boolean)),
  );

  return {
    canonical: group.canonical,
    canonicalKey: normalizeSearch(group.canonical),
    aliases: aliasEntries,
    terms,
  };
});

function aliasGroupForValue(value: string) {
  const normalizedValue = normalizeSearch(value);
  if (!normalizedValue) return undefined;
  return normalizedAliasGroups.find((group) => group.terms.includes(normalizedValue));
}

export function resolveLocationAlias(value: string): LocationAliasResolution | null {
  const rawInput = value.trim();
  const normalizedValue = normalizeSearch(rawInput);
  if (!normalizedValue) return null;

  for (const group of normalizedAliasGroups) {
    const alias = group.aliases.find((entry) => normalizeSearch(entry.value) === normalizedValue);
    if (!alias || normalizedValue === group.canonicalKey) continue;
    return {
      rawInput,
      matchedAlias: alias.value,
      displayLabel: alias.label,
      canonical: group.canonical,
      canonicalKey: group.canonicalKey,
    };
  }
  return null;
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
