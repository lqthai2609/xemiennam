"use client";
import type { JsonLdObject } from "@/lib/schema";
import { usePromotionLease } from "@/components/promotion-price";

export interface PromotionServiceSchema {
  data: JsonLdObject;
  fallback: JsonLdObject;
  unpriced: JsonLdObject;
  expiresAt?: string;
}

/** Both versions are built on the server; expiry only switches to its base-price fallback. */
export function ExpiringJsonLd({ data, fallback, expiresAt }: { data: JsonLdObject; fallback: JsonLdObject; expiresAt?: string }) {
  const active = usePromotionLease(expiresAt);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(active ? data : fallback).replace(/</g, "\\u003c") }} />;
}
