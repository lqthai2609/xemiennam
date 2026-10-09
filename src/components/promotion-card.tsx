"use client";
import Link from "next/link";
import type { PublicPromotionCard } from "@/lib/api/promotions";
import { PromotionPrice, usePromotionLease } from "@/components/promotion-price";

export function PromotionCard({ promotion }: { promotion: PublicPromotionCard }) {
  const active = usePromotionLease(promotion.view.claim?.expiresAt);
  return <article className={`promo-card${active ? "" : " is-expired"}`}>
    <h3>{promotion.routeLabel}</h3>
    <p>{promotion.vehicleLabel} · {promotion.packageLabel}</p>
    <PromotionPrice view={promotion.view} />
    {active ? <Link className="button button-primary promo-cta" href={promotion.href} prefetch={false}>Xem đúng tuyến và gói</Link> : <Link className="button" href="/bang-gia">Xem giá hiện hành</Link>}
  </article>;
}
