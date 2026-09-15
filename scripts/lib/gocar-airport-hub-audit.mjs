export const DAY20_TARGETS = ["Vũng Tàu", "Biên Hòa", "Tây Ninh", "Phan Thiết", "Cần Thơ"];

function decodeHtml(value = "") {
  return value
    .replace(/<!--\s*-->/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function textFromHtml(value = "") {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLabel(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractDirectionHtml(html, id) {
  const marker = `id="${id}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return "";

  const blockStart = html.lastIndexOf("<div", markerIndex);
  if (blockStart < 0) return "";

  const otherId = id === "from-airport" ? "to-airport" : "from-airport";
  const otherMarkerIndex = html.indexOf(`id="${otherId}"`, markerIndex + marker.length);
  const nextSection = html.indexOf("</section>", markerIndex + marker.length);
  let blockEnd = html.length;

  if (otherMarkerIndex >= 0) {
    const nextDiv = html.lastIndexOf("<div", otherMarkerIndex);
    if (nextDiv > blockStart) blockEnd = nextDiv;
  } else if (nextSection >= 0) {
    blockEnd = nextSection;
  }

  return html.slice(blockStart, blockEnd);
}

function extractCards(blockHtml, direction) {
  const cards = [];
  const articlePattern = /<article\b[^>]*class="[^"]*airport-route-card[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;

  for (const match of blockHtml.matchAll(articlePattern)) {
    const cardHtml = match[1];
    const strongValues = [...cardHtml.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].map((entry) =>
      textFromHtml(entry[1]),
    );
    const hrefMatch = cardHtml.match(/href="([^"]+)"/i);
    const plainText = textFromHtml(cardHtml);

    cards.push({
      direction,
      origin: strongValues[0] ?? "",
      destination: strongValues[1] ?? "",
      priceText: strongValues[2] ?? "",
      priceMode: /liên hệ/i.test(plainText) ? "contact" : /giá từ/i.test(plainText) ? "fixed" : "unknown",
      href: hrefMatch?.[1] ?? "",
    });
  }

  return cards;
}

export function parseAirportHubHtml(html) {
  return {
    fromAirport: extractCards(extractDirectionHtml(html, "from-airport"), "from_airport"),
    toAirport: extractCards(extractDirectionHtml(html, "to-airport"), "to_airport"),
  };
}

function findRoute(cards, target, field) {
  const needle = normalizeLabel(target);
  return cards.find((card) => normalizeLabel(card[field]) === needle) ?? null;
}

export function auditDay20Targets(html, targets = DAY20_TARGETS) {
  const parsed = parseAirportHubHtml(html);

  return targets.map((target) => {
    const fromAirport = findRoute(parsed.fromAirport, target, "destination");
    const toAirport = findRoute(parsed.toAirport, target, "origin");
    const directionsReady = Boolean(fromAirport && toAirport);
    const pricingReady = [fromAirport, toAirport]
      .filter(Boolean)
      .every((route) => route.priceMode === "fixed" || route.priceMode === "contact");

    return {
      target,
      fromAirport,
      toAirport,
      directionsReady,
      pricingReady,
      ready: directionsReady && pricingReady,
    };
  });
}
