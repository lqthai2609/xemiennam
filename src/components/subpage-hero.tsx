import { RouteFinderForm } from "@/components/route-finder-form";
import type { RouteFinderProvince } from "@/lib/route-finder";

type SubpageHeroProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  backgroundImage: string;
  provinces: RouteFinderProvince[];
};

export function SubpageHero({
  title,
  eyebrow = "MỞ RỘNG HÀNH TRÌNH",
  description,
  backgroundImage,
  provinces,
}: SubpageHeroProps) {
  return (
    <div className="subpage-hero-wrap">
      <section
        className="subpage-hero"
        style={{ backgroundImage: `url(${backgroundImage})` }}
        aria-labelledby="subpage-hero-title"
      >
        <div className="subpage-hero-overlay" aria-hidden="true" />
        <div className="subpage-hero-content">
          <p className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</p>
          <h1 id="subpage-hero-title">{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
      </section>
      <RouteFinderForm provinces={provinces} />
    </div>
  );
}

export const defaultSubpageHeroImage = "/images/services/city-tour.png";
