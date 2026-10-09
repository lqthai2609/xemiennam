/**
 * WordPress REST `modified` is a local datetime without an offset. It cannot be
 * emitted unchanged as a W3C sitemap datetime. Use its real calendar date,
 * which the sitemap protocol permits, without guessing a timezone or freshness.
 * Invalid/missing source dates are omitted; this never substitutes today's date.
 */
export function sitemapLastModified(value: unknown): string | undefined {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return undefined;
    value = value.toISOString();
  }
  if (typeof value !== "string") return undefined;

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))?)?$/.exec(value.trim());
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0 || month < 1 || month > 12) return undefined;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]) return undefined;

  return `${match[1]}-${match[2]}-${match[3]}`;
}
