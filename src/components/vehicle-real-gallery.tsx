"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function VehicleRealGallery({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") setActiveIndex((index) => index === null ? null : (index - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") setActiveIndex((index) => index === null ? null : (index + 1) % images.length);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="vehicle-real-gallery" aria-label="Hình ảnh thực tế">
        {images.map((image, index) => (
          <button className={index === 0 ? "vehicle-real-gallery-item is-featured" : "vehicle-real-gallery-item"} key={`${image}-${index}`} type="button" onClick={() => setActiveIndex(index)} aria-label={`Mở ảnh ${index + 1}`}>
            <img src={image} alt={`Ảnh thực tế ${index + 1}`} />
          </button>
        ))}
      </div>
      {activeIndex !== null && (
        <div className="vehicle-lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh thực tế" onClick={() => setActiveIndex(null)}>
          <button className="vehicle-lightbox-close" type="button" onClick={() => setActiveIndex(null)} aria-label="Đóng ảnh"><X /></button>
          <button className="vehicle-lightbox-nav is-prev" type="button" onClick={(event) => { event.stopPropagation(); setActiveIndex((activeIndex - 1 + images.length) % images.length); }} aria-label="Ảnh trước"><ChevronLeft /></button>
          <img src={images[activeIndex]} alt={`Ảnh thực tế ${activeIndex + 1} trên ${images.length}`} onClick={(event) => event.stopPropagation()} />
          <button className="vehicle-lightbox-nav is-next" type="button" onClick={(event) => { event.stopPropagation(); setActiveIndex((activeIndex + 1) % images.length); }} aria-label="Ảnh tiếp theo"><ChevronRight /></button>
          <span className="vehicle-lightbox-count">{activeIndex + 1} / {images.length}</span>
        </div>
      )}
    </>
  );
}
