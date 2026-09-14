import { SITE_AREA_SERVED, SITE_DESCRIPTION, SITE_HOTLINE_TEL, SITE_NAME, SITE_URL } from "@/lib/site-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonLdObject = Record<string, any>;

export type ServiceOfferInput = {
  name: string;
  price: number;
};

export type ServiceAggregateOfferInput = {
  lowPrice: number;
  highPrice: number;
  priceCurrency: "VND";
  offers: ServiceOfferInput[];
};

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
}: {
  name: string;
  description: string;
  url: string;
  areaServed?: string | string[];
  offers?: ServiceAggregateOfferInput;
  providerName?: string;
}): JsonLdObject {
  const validOffers = offers?.offers.filter((offer) => Number.isFinite(offer.price) && offer.price > 0) ?? [];
  const aggregateOffer =
    offers && validOffers.length > 0 && offers.lowPrice > 0 && offers.highPrice > 0
      ? {
          "@type": "AggregateOffer",
          priceCurrency: offers.priceCurrency,
          lowPrice: offers.lowPrice,
          highPrice: offers.highPrice,
          offerCount: validOffers.length,
          offers: validOffers.map((offer) => ({
            "@type": "Offer",
            name: offer.name,
            price: offer.price,
            priceCurrency: offers.priceCurrency,
          })),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Cho thuê xe nguyên chiếc",
    name,
    description,
    url: `${SITE_URL}${url}`,
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
