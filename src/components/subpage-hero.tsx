import { RouteFinderForm } from "@/components/booking-search";
import Image from "next/image";
import type { Route } from "@/types/route";

type SubpageHeroProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  backgroundImage: string;
  routes?: Route[];
  showFinder?: boolean;
};

export function SubpageHero({
  title,
  eyebrow = "MỞ RỘNG HÀNH TRÌNH",
  description,
  routes = [],
  showFinder = true,
}: SubpageHeroProps) {
  return (
    <div className="subpage-hero-wrap">
      <section
        className="subpage-hero"
        aria-labelledby="subpage-hero-title"
      >
        <Image
          src={defaultSubpageHeroImage}
          alt=""
          aria-hidden="true"
          fill
          preload
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center", zIndex: -2 }}
        />
        <div className="subpage-hero-overlay" aria-hidden="true" />
        <div className="subpage-hero-content">
          <p className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</p>
          <h1 id="subpage-hero-title">{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
      </section>
      {showFinder ? <RouteFinderForm routes={routes} /> : null}
    </div>
  );
}

export const defaultSubpageHeroImage = "/images/hero-dat-xe-sai-gon.webp?v=2";
