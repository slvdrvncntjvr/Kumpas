"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { categories } from "@/data/categories";
import { phrases } from "@/data/phrases";
import { PhraseCard } from "@/components/PhraseCard";
import type { PhraseCategory } from "@/types/phrase";
import { useLanguage } from "@/i18n/LanguageProvider";
import { loadFavourites } from "@/utils/favourites";

type FilterMode = PhraseCategory | "all" | "favourites";

/** Phrase library with horizontal scrollable category filter and favourites. */
export function LibraryView() {
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  const initialCategory = searchParams.get("category");

  const [activeFilter, setActiveFilter] = useState<FilterMode>(
    isCategory(initialCategory) ? initialCategory : "all",
  );
  const [query, setQuery] = useState("");
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // Load favourites on mount (client only).
  useEffect(() => {
    setFavouriteIds(loadFavourites());
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = phrases.filter((phrase) => {
      if (activeFilter === "favourites") {
        if (!favouriteIds.includes(phrase.id)) return false;
      } else if (activeFilter !== "all") {
        if (phrase.category !== activeFilter) return false;
      }
      if (!term) return true;
      return (
        phrase.title.toLowerCase().includes(term) ||
        phrase.text.toLowerCase().includes(term) ||
        phrase.titleFil.toLowerCase().includes(term) ||
        phrase.textFil.toLowerCase().includes(term)
      );
    });

    return filtered.sort((a, b) => {
      if (a.priority === "urgent" && b.priority !== "urgent") return -1;
      if (a.priority !== "urgent" && b.priority === "urgent") return 1;
      return 0;
    });
  }, [activeFilter, query, favouriteIds]);

  return (
    <div className="flex flex-col gap-6 page-enter">
      <h1 className="text-3xl font-black tracking-tight">
        {t("library.title")}
      </h1>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("library.search")}
        aria-label={t("library.search")}
        className="min-h-12 rounded-button border border-border bg-surface px-4 text-base shadow-[var(--shadow)]"
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold uppercase tracking-wider text-text-muted">
          {t("library.category")}
        </span>
        <div className="relative">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as FilterMode)}
            aria-label={t("library.filterAria")}
            className="min-h-12 w-full appearance-none rounded-button border border-border bg-surface px-4 pr-10 text-base font-bold shadow-[var(--shadow)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-bee-yellow-bright"
          >
          <option value="all">{t("library.all")}</option>
          <option value="favourites">Starred</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {language === "fil" ? category.labelFil : category.label}
            </option>
          ))}
        </select>
        {/* Dropdown arrow icon */}
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <svg className="h-5 w-5 text-text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {visible.map((phrase) => (
            <li key={phrase.id}>
              <PhraseCard phrase={phrase} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="hex-pattern rounded-card border border-dashed border-border p-8 text-center text-text-muted">
          {activeFilter === "favourites"
            ? "No starred phrases yet. Tap ★ on any phrase card to save it here."
            : t("library.noResults")}
        </p>
      )}
    </div>
  );
}



function isCategory(value: string | null): value is PhraseCategory {
  return (
    value === "emergency" ||
    value === "health" ||
    value === "barangay" ||
    value === "transportation" ||
    value === "school" ||
    value === "basic"
  );
}
