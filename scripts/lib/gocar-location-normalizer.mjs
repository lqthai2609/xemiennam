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

export function normalizeLegacyLocation(raw) {
  let label = decodeHtml(raw);

  label = label.replace(/\s+\d+\s*(?:ngày|ngay)(?:\s+\d+\s*(?:đêm|dem))?\s*$/iu, "");
  label = label.replace(/\s+\d+\s*n\s*\d+\s*[đd]\s*$/iu, "");
  label = label.replace(/\s+/g, " ").trim();

  const key = comparisonKey(label);
  if (["tphcm", "tp hcm", "tp ho chi minh", "thanh pho ho chi minh", "ho chi minh", "sai gon"].includes(key)) {
    return "TP. Hồ Chí Minh";
  }

  const cityMatch = label.match(/^TP\s+(.+)$/iu);
  if (cityMatch) return `TP. ${cityMatch[1].trim()}`;

  return label;
}

export function locationNeedsReview(label) {
  return /[\/()]/u.test(String(label ?? ""));
}
