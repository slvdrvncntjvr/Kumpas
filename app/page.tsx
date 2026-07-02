"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Siren, MessageSquare, Camera, Clock } from "lucide-react";
import { categories } from "@/data/categories";
import { CategoryCard } from "@/components/CategoryCard";
import { useLanguage } from "@/i18n/LanguageProvider";
import { loadRecents } from "@/utils/recentPhrases";
import { getPhraseById } from "@/data/phrases";
import type { Phrase } from "@/types/phrase";

/** Home: emergency action, recent phrases, category grid, quick links. */
export default function HomePage() {
  const { t, language } = useLanguage();
  const [recents, setRecents] = useState<Phrase[]>([]);

  useEffect(() => {
    const ids = loadRecents();
    const resolved = ids
      .map((id) => getPhraseById(id))
      .filter((p): p is Phrase => !!p);
    setRecents(resolved);
  }, []);

  return (
    <div className="flex flex-col gap-8 page-enter">
      <section aria-labelledby="home-title">
        <h1
          id="home-title"
          className="max-w-2xl text-4xl font-black leading-[1.0] tracking-tight sm:text-5xl"
        >
          {t("home.title")}
        </h1>
      </section>

      {/* Large primary emergency action */}
      <Link
        href="/emergency"
        className="flex min-h-20 w-full items-center justify-center gap-2 sm:gap-3 rounded-card bg-danger px-4 sm:px-6 text-center text-xl sm:text-2xl font-black text-white shadow-[var(--shadow)] transition-colors hover:brightness-110"
      >
        <Siren aria-hidden="true" className="h-8 w-8" />
        {t("home.emergency")}
      </Link>

      {/* Recents row — only shown after the user has visited phrases */}
      {recents.length > 0 && (
        <section aria-labelledby="recents-title">
          <h2
            id="recents-title"
            className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-text-muted"
          >
            <Clock aria-hidden="true" className="h-4 w-4" />
            {t("home.recentlyUsed")}
          </h2>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
            {recents.map((phrase) => (
              <Link
                key={phrase.id}
                href={`/communication/${phrase.id}`}
                className="shrink-0 whitespace-nowrap rounded-pill border border-border bg-surface px-4 py-2 text-sm font-bold shadow-[var(--shadow)] transition-colors hover:bg-surface-alt hover:-translate-y-0.5 active:translate-y-0"
              >
                {language === "fil" ? phrase.titleFil : phrase.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Phrase categories */}
      <section aria-labelledby="cat-title">
        <h2 id="cat-title" className="mb-3 text-xl font-extrabold">
          {t("home.phraseCategories")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* More tools */}
      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className="mb-3 text-xl font-extrabold">
          {t("home.moreTools")}
        </h2>
        <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
          <Link
            href="/hearing"
            className="flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface px-4 sm:px-5 text-base sm:text-lg text-balance font-bold shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
          >
            <MessageSquare aria-hidden="true" className="h-6 w-6 shrink-0 text-bee-amber" />
            {t("home.hearingMode")}
          </Link>
          <Link
            href="/camera"
            className="flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface px-4 sm:px-5 text-base sm:text-lg text-balance font-bold shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
          >
            <Camera aria-hidden="true" className="h-6 w-6 shrink-0 text-bee-amber" />
            {t("home.cameraDemo")}
          </Link>
        </div>
      </section>
    </div>
  );
}
