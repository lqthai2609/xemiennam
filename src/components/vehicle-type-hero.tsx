import { UnifiedHero } from "@/components/unified-hero";
import type { VehicleCategory } from "@/types/vehicle-category";

export function VehicleTypeHero({ category }: { category: VehicleCategory }) {
  return (
    <UnifiedHero
      eyebrow={category.label}
      title={category.title}
      description={category.description}
      backgroundImage={category.imageUrl || "/images/services/city-tour.png"}
      backHref="/loai-xe"
      backLabel="Tất cả loại xe"
    />
  );
}

export default VehicleTypeHero;
