"use client";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { RequiredMark } from "@/components/required-mark";
import { canonicalLocationKey, locationMatchesQuery, normalizeSearch, resolveLocationAlias } from "@/lib/location-search";
import { getPublicLocationLabel, HO_CHI_MINH_PUBLIC_LABEL } from "@/lib/public-location-label";

export function LocationField({
  label,
  value,
  onChange,
  placeholder,
  listId,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  listId: string;
  options: string[];
  required?: boolean;
}) {
  const inputId = `${listId}-input`;
  const suggestionsId = `${listId}-suggestions`;
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const aliasResolution = useMemo(() => resolveLocationAlias(value), [value]);

  const suggestions = useMemo(() => {
    const query = normalizeSearch(value);
    const filtered = query
      ? options.filter((option) => locationMatchesQuery(option, value))
      : options;
    return filtered.slice(0, 8);
  }, [options, value]);

  function selectSuggestion(option: string) {
    onChange(
      aliasResolution && canonicalLocationKey(option) === aliasResolution.canonicalKey
        ? value.trim()
        : option,
    );
    setSuggestionsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!suggestions.length) return;
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      if (!suggestions.length) return;
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }
    if (event.key === "Enter" && suggestionsOpen && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showSuggestions = suggestionsOpen && suggestions.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-foreground">
      <label htmlFor={inputId} className="form-field-label">{label}{required && <RequiredMark />}</label>
      <div className="relative">
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-primary"
          size={18}
        />
        <input
          id={inputId}
          required={required}
          aria-required={required}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setSuggestionsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => window.setTimeout(() => {
            setSuggestionsOpen(false);
            setActiveIndex(-1);
          }, 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={suggestionsId}
          aria-activedescendant={activeIndex >= 0 ? `${suggestionsId}-${activeIndex}` : undefined}
          className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base font-medium text-foreground outline-none transition placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        />

        {showSuggestions && (
          <div
            id={suggestionsId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1.5 text-foreground shadow-lg"
          >
            {suggestions.map((option, index) => (
              <button
                id={`${suggestionsId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                key={option}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(option)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${index === activeIndex ? "bg-secondary text-foreground" : "hover:bg-muted"}`}
              >
                <MapPin aria-hidden="true" size={15} className="shrink-0 text-primary" />
                {aliasResolution && canonicalLocationKey(option) === aliasResolution.canonicalKey ? (
                  <span className="min-w-0">
                    <span className="block font-semibold">{aliasResolution.displayLabel}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {getPublicLocationLabel(aliasResolution.canonical)} · Áp dụng giá tuyến {HO_CHI_MINH_PUBLIC_LABEL}
                    </span>
                  </span>
                ) : <span>{option}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {aliasResolution && (
        <p className="m-0 flex items-start gap-1.5 text-xs font-medium leading-5 text-primary" role="status">
          <span aria-hidden="true">✓</span>
          <span>Đã quy đổi về {getPublicLocationLabel(aliasResolution.canonical)} · Áp dụng giá tuyến {HO_CHI_MINH_PUBLIC_LABEL}</span>
        </p>
      )}
    </div>
  );
}
