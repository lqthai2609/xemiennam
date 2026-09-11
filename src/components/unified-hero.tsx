import type { ReactNode } from "react";
import Image from "next/image";
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
      aria-labelledby="unified-hero-title"
    >
      <Image
        src={backgroundImage}
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        quality={75}
        style={{ objectFit: "cover", objectPosition: "center", zIndex: -2 }}
        aria-hidden="true"
      />
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
