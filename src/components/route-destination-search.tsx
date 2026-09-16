"use client";

import { useId, useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";

import {
  canonicalLocationKey,
  canonicalLocationLabel,
  locationMatchesQuery,
  normalizeSearch,
} from "@/lib/location-search";
import type { Route } from "@/types/route";

type RouteDestinationSearchProps = {
  routes: Route[];
  value: string;
  onChange: (value: string) => void;
};

function uniqueLocationOptions(routes: Route[]) {
  const values = new Map<string, string>();

  for (const route of routes) {
    for (const rawValue of [route.from, route.to, route.region]) {
      if (!rawValue?.trim()) continue;
      const label = canonicalLocationLabel(rawValue);
      const key = canonicalLocationKey(label);
      if (!key || values.has(key)) continue;
      values.set(key, label);
    }
  }

  return Array.from(values.values()).sort((a, b) => a.localeCompare(b, "vi"));
}

export function RouteDestinationSearch({ routes, value, onChange }: RouteDestinationSearchProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-input`;
  const listboxId = `${generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const options = useMemo(() => uniqueLocationOptions(routes), [routes]);
  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeSearch(value);
    const filtered = normalizedQuery
      ? options.filter((option) => locationMatchesQuery(option, value))
      : options;
    return filtered.slice(0, 8);
  }, [options, value]);

  const showSuggestions = open && suggestions.length > 0;

  function closeSuggestions() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function selectSuggestion(option: string) {
    onChange(option);
    closeSuggestions();
  }

  function clearSearch() {
    onChange("");
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!suggestions.length) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      if (!suggestions.length) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      if (showSuggestions && activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") closeSuggestions();
  }

  return (
    <div className="relative my-8 md:my-10">
      <label htmlFor={inputId} className="sr-only">
        Tìm nhanh tuyến đường theo điểm đi hoặc điểm đến
      </label>

      <div className="relative">
        <Search
          aria-hidden="true"
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary"
        />

        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(closeSuggestions, 120)}
          onKeyDown={handleKeyDown}
          placeholder="Bạn muốn tìm tuyến ở đâu? Ví dụ: Sài Gòn, Vũng Tàu, Cần Thơ…"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-12 text-base font-medium text-foreground outline-none transition placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 md:h-[60px]"
        />

        {value ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSearch}
            aria-label="Xóa tìm kiếm tuyến đường"
            className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Gợi ý địa điểm"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-2 text-foreground shadow-lg"
        >
          {suggestions.map((option, index) => (
            <button
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              key={canonicalLocationKey(option)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(option)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                index === activeIndex ? "bg-secondary text-foreground" : "hover:bg-muted"
              }`}
            >
              <MapPin aria-hidden="true" size={16} className="shrink-0 text-primary" />
              <span>{option}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
