import type { ReactNode } from "react";
import Link from "next/link";

type UnifiedHeroProps = {
  title: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  backgroundImage?: string;
  backHref?: string;
  backLabel?: string;
  meta?: ReactNode;
};

export function UnifiedHero({
  title,
  eyebrow = "MỞ RỘNG HÀNH TRÌNH",
  description,
  backgroundImage = "/images/services/city-tour.png",
  backHref,
  backLabel,
  meta,
}: UnifiedHeroProps) {
  return (
    <section
      className="subpage-hero unified-hero"
      style={{ backgroundImage: `url(${backgroundImage})` }}
      aria-labelledby="unified-hero-title"
    >
      <div className="subpage-hero-overlay" aria-hidden="true" />
      <div className="subpage-hero-content">
        {backHref && backLabel ? <Link className="back-link unified-hero-back" href={backHref}>← {backLabel}</Link> : null}
        <p className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</p>
        <h1 id="unified-hero-title">{title}</h1>
        {description ? <p>{description}</p> : null}
        {meta ? <div className="unified-hero-meta">{meta}</div> : null}
      </div>
    </section>
  );
}
