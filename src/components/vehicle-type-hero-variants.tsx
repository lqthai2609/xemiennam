import Link from "next/link";
import { ArrowRight, BusFront } from "lucide-react";
import { MediaPhoto } from "@/components/media-photo";
import type { VehicleCategory } from "@/types/vehicle-category";

type Props = { category: VehicleCategory };

function HeroImage({ category }: Props) {
  return category.imageUrl ? (
    <MediaPhoto src={category.imageUrl} alt={`${category.label} - ${category.title}`} />
  ) : (
    <BusFront aria-hidden="true" />
  );
}

function HeroCopy({ category }: Props) {
  return (
    <>
      <Link className="back-link" href="/loai-xe">← Tất cả loại xe</Link>
      <p className="eyebrow"><span className="eyebrow-line" /> {category.label}</p>
      <h1>{category.title}</h1>
      <p>{category.description}</p>
      <Link className="button button-primary" href="/#booking">Tư vấn lịch trình <ArrowRight size={16} /></Link>
    </>
  );
}

export function VehicleTypeHeroA({ category }: Props) {
  return (
    <section className={`vehicle-hero-variant vehicle-hero-a ${category.color}`} aria-labelledby="vehicle-hero-a-title">
      <div className="vehicle-hero-a-media"><HeroImage category={category} /></div>
      <div className="vehicle-hero-a-overlay" aria-hidden="true" />
      <div className="vehicle-hero-a-copy">
        <Link className="back-link" href="/loai-xe">← Tất cả loại xe</Link>
        <p className="eyebrow"><span className="eyebrow-line" /> {category.label}</p>
        <h1 id="vehicle-hero-a-title">{category.title}</h1>
        <p>{category.description}</p>
        <Link className="button button-primary" href="/#booking">Tư vấn lịch trình <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

export function VehicleTypeHeroB({ category }: Props) {
  return (
    <section className={`vehicle-hero-variant vehicle-hero-b ${category.color}`} aria-labelledby="vehicle-hero-b-title">
      <div className="vehicle-hero-b-copy"><HeroCopy category={category} /></div>
      <div className="vehicle-hero-b-media"><HeroImage category={category} /></div>
    </section>
  );
}

export function VehicleTypeHeroC({ category }: Props) {
  return (
    <section className={`vehicle-hero-variant vehicle-hero-c ${category.color}`} aria-labelledby="vehicle-hero-c-title">
      <div className="vehicle-hero-c-copy">
        <p className="section-label">PHƯƠNG ÁN C — ẢNH NỔI</p>
        <HeroCopy category={category} />
      </div>
      <div className="vehicle-hero-c-frame">
        <div className="vehicle-hero-c-media"><HeroImage category={category} /></div>
      </div>
    </section>
  );
}

export function VehicleTypeHeroVariants({ category }: Props) {
  return (
    <div className="vehicle-hero-variants" aria-label="Ba phương án hero loại xe">
      <VehicleTypeHeroA category={category} />
      <VehicleTypeHeroB category={category} />
      <VehicleTypeHeroC category={category} />
    </div>
  );
}

export default VehicleTypeHeroVariants;
