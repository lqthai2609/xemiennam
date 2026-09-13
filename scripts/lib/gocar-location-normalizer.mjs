export function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripVietnamese(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d");
}

export function comparisonKey(value) {
  return stripVietnamese(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyLocation(value) {
  return stripVietnamese(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CANONICAL_ALIASES = new Map([
  ["tphcm", "TP. Hồ Chí Minh"],
  ["tp hcm", "TP. Hồ Chí Minh"],
  ["tp ho chi minh", "TP. Hồ Chí Minh"],
  ["thanh pho ho chi minh", "TP. Hồ Chí Minh"],
  ["ho chi minh", "TP. Hồ Chí Minh"],
  ["sai gon", "TP. Hồ Chí Minh"],
  ["tp vung tau", "Vũng Tàu"],
  ["thanh pho vung tau", "Vũng Tàu"],
  ["vung tau", "Vũng Tàu"],
  ["da lat lam dong", "Đà Lạt"],
  ["chau doc an giang", "Châu Đốc"],
  ["cai be tien giang", "Cái Bè"],
  ["tien giang my tho", "Mỹ Tho"],
  ["moc bai", "Cửa khẩu Mộc Bài"],
  ["cua khau moc bai", "Cửa khẩu Mộc Bài"],
]);

const REVIEW_KEYS = new Set([
  "tay ninh",
  "thanh pho tay ninh",
  "tp moi binh duong",
  "kcn vsip 1 2",
  "ben tre tp ben tre",
]);

export function normalizeLegacyLocation(raw) {
  let label = decodeHtml(raw);

  // Package/thời lượng thuộc Pricing, không phải Location.
  label = label.replace(/\s+\d+\s*(?:ngày|ngay)(?:\s+\d+\s*(?:đêm|dem))?\s*$/iu, "");
  label = label.replace(/\s+\d+\s*n\s*\d+\s*[đd]\s*$/iu, "");
  label = label.replace(/\s+/g, " ").trim();

  const key = comparisonKey(label);
  const canonical = CANONICAL_ALIASES.get(key);
  if (canonical) return canonical;

  const cityMatch = label.match(/^TP\s+(.+)$/iu);
  if (cityMatch) label = `TP. ${cityMatch[1].trim()}`;

  return label;
}

export function locationDisposition(label) {
  const text = String(label ?? "").trim();
  const key = comparisonKey(text);

  if (!text) return "exclude";
  if (/^city\s*tour\b/i.test(stripVietnamese(text))) return "exclude";
  if (REVIEW_KEYS.has(key)) return "review";
  if (/[\/()&]/u.test(text)) return "review";

  return "apply";
}

export function locationNeedsReview(label) {
  return locationDisposition(label) === "review";
}
