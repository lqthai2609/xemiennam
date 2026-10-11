import { SITE_AREA_SERVED, SITE_DESCRIPTION, SITE_HOTLINE_TEL, SITE_NAME, SITE_URL } from "@/lib/site-config";
import type { PromotionPriceView } from "@/types/promotion-price";
import type { PromotionTuple } from "@/lib/api/promotion-model";
import { promotionTupleKey } from "@/lib/api/promotion-model";
import { promotionLeaseActive } from "@/lib/promotion-expiry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonLdObject = Record<string, any>;

export type ServiceOfferInput = {
  name: string;
  price: number;
  validFrom?: string;
  validThrough?: string;
  unitText?: string;
};

export type ServiceOfferCandidateInput = {
  name: string;
  mode: string;
  price?: number;
  tuple?: PromotionTuple;
  promotionView?: PromotionPriceView;
};

export type ServiceAggregateOfferInput = {
  lowPrice: number;
  highPrice: number;
  priceCurrency: "VND";
  offers: ServiceOfferInput[];
};

export type BreadcrumbItemInput = {
  name: string;
  url: string;
};

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export function buildFixedServiceOffers(
  candidates: ServiceOfferCandidateInput[],
  now: number = Date.now(),
): ServiceAggregateOfferInput | undefined {
  const offers = candidates
    .filter(
      (candidate): candidate is ServiceOfferCandidateInput & { price: number } =>
        candidate.mode === "fixed" &&
        typeof candidate.price === "number" &&
        Number.isFinite(candidate.price) &&
        candidate.price > 0,
    )
    .map((candidate) => {
      const view = candidate.promotionView;
      const claim = view?.claim;
      const useClaim = view?.offerEligible && view.purpose === "base_catalog" && view.mode === "fixed"
        && candidate.tuple && promotionTupleKey(candidate.tuple) === promotionTupleKey(view.tuple)
        && candidate.price === view.originalAmount && claim?.layer === "base_price"
        && promotionLeaseActive(claim.expiresAt, now) && Number.isSafeInteger(view.amount) && view.amount! > 0;
      return { name: candidate.name, price: useClaim ? view.amount! : candidate.price,
        ...(useClaim ? { validFrom: claim.validFrom, validThrough: claim.validThrough, unitText: view.tuple.package_key } : {}) };
    });

  if (offers.length === 0) return undefined;
  const prices = offers.map((offer) => offer.price);
  return {
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    priceCurrency: "VND",
    offers,
  };
}

export function buildBreadcrumbListSchema(items: BreadcrumbItemInput[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function buildLocalBusinessSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    telephone: SITE_HOTLINE_TEL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "TP. Hồ Chí Minh",
      addressCountry: "VN",
    },
    areaServed: SITE_AREA_SERVED,
    priceRange: "$$",
  };
}

export function buildServiceSchema({
  name,
  description,
  url,
  areaServed,
  offers,
  providerName = SITE_NAME,
  serviceType = "Cho thuê xe nguyên chiếc",
}: {
  name: string;
  description: string;
  url: string;
  areaServed?: string | string[];
  offers?: ServiceAggregateOfferInput;
  providerName?: string;
  serviceType?: string;
}): JsonLdObject {
  const validOffers = offers?.offers.filter((offer) => Number.isFinite(offer.price) && offer.price > 0) ?? [];
  const validPrices = validOffers.map((offer) => offer.price);
  const aggregateOffer =
    validOffers.length > 0
      ? {
          "@type": "AggregateOffer",
          priceCurrency: offers?.priceCurrency ?? "VND",
          lowPrice: Math.min(...validPrices),
          highPrice: Math.max(...validPrices),
          offerCount: validOffers.length,
          offers: validOffers.map((offer) => ({
            "@type": "Offer",
            name: offer.name,
            price: offer.price,
            priceCurrency: offers?.priceCurrency ?? "VND",
            ...(offer.validFrom ? { validFrom: offer.validFrom } : {}),
            ...(offer.validThrough ? { validThrough: offer.validThrough } : {}),
            ...(offer.unitText ? { priceSpecification: { "@type": "UnitPriceSpecification", price: offer.price,
              priceCurrency: "VND", unitText: offer.unitText, validFrom: offer.validFrom, validThrough: offer.validThrough } } : {}),
          })),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType,
    name,
    description,
    url: absoluteUrl(url),
    provider: {
      "@type": "LocalBusiness",
      name: providerName,
      telephone: SITE_HOTLINE_TEL,
      url: SITE_URL,
    },
    areaServed: areaServed ?? SITE_AREA_SERVED,
    ...(aggregateOffer ? { offers: aggregateOffer } : {}),
  };
}

export function buildFaqPageSchema(items: { question: string; answer: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildAggregateRatingSchema({
  ratingValue,
  reviewCount,
  reviews,
}: {
  ratingValue: number;
  reviewCount: number;
  reviews: { author: string; ratingValue: number; reviewBody: string; datePublished?: string }[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    url: SITE_URL,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(ratingValue.toFixed(1)),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 20).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.ratingValue, bestRating: 5, worstRating: 1 },
      reviewBody: r.reviewBody,
      ...(r.datePublished ? { datePublished: r.datePublished } : {}),
    })),
  };
}
