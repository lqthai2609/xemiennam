"use client";
import { useRef, type ReactNode } from "react";

/** Shared presentation; callers supply only the packages actually available. */
export function JourneyPackageTabs({ items, value, onChange, label = "Chọn gói dịch vụ" }: {
  items: { key: string; label: string; icon?: ReactNode }[]; value: string; onChange: (key: string) => void; label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return <div ref={ref} className="route-direction-tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.key} type="button" role="tab" aria-selected={value === item.key}
      tabIndex={value === item.key ? 0 : -1} className={value === item.key ? "is-selected" : ""}
      onClick={() => onChange(item.key)} onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
        onChange(items[next].key);
        ref.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
      }}>{item.icon}{item.label}</button>)}
  </div>;
}
