"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import type { Phrase } from "@/types/phrase";
import { useLanguage } from "@/i18n/LanguageProvider";
import { isFavourite, toggleFavourite } from "@/utils/favourites";

/**
 * List item for a phrase. Urgent phrases get a danger-red left border + badge.
 * Includes an inline star button for favouriting without navigating away.
 */
export function PhraseCard({ phrase }: { phrase: Phrase }) {
  const { language, t } = useLanguage();
  const urgent = phrase.priority === "urgent";
  const title = language === "fil" ? phrase.titleFil : phrase.title;
  const text = language === "fil" ? phrase.textFil : phrase.text;
  const [starred, setStarred] = useState(() => isFavourite(phrase.id));

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault(); // don't navigate
    e.stopPropagation();
    const nowFav = toggleFavourite(phrase.id);
    setStarred(nowFav);
    navigator.vibrate?.([30]);
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-card border bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5 ${
        urgent ? "border-l-4 border-l-danger border-border" : "border-border"
      }`}
    >
      <Link
        href={`/communication/${phrase.id}`}
        className="min-w-0 flex-1 p-4"
      >
        <span className="block text-lg font-bold">{title}</span>
        <span className="block truncate text-sm text-text-muted mt-0.5">{text}</span>
      </Link>

      <div className="flex flex-shrink-0 items-center gap-2 pr-3">
        {urgent && (
          <span className="rounded-pill bg-danger px-2.5 py-1 text-xs font-bold text-white">
            {t("library.urgent")}
          </span>
        )}
        <button
          type="button"
          onClick={handleStar}
          aria-label={starred ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={starred}
          className="flex h-10 w-10 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-surface-alt"
        >
          <Star
            aria-hidden="true"
            className={`h-5 w-5 transition-colors ${starred ? "fill-bee-yellow text-bee-yellow" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
