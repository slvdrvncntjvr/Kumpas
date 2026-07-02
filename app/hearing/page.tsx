"use client";

import { useState } from "react";
import { Sparkles, Wifi, WifiOff } from "lucide-react";
import { simplify, suggestPhrases } from "@/services/simplifierService";
import {
  simplifyWithGemini,
  isGeminiConfigured,
} from "@/services/geminiService";
import { SpeakButton } from "@/components/SpeakButton";
import { PhraseCard } from "@/components/PhraseCard";
import type { Phrase } from "@/types/phrase";
import { useLanguage } from "@/i18n/LanguageProvider";

type SimplifySource = "gemini" | "local" | null;

/**
 * Hearing person mode: staff types a message, the app simplifies it.
 *
 * Online + Gemini key configured → uses Gemini 2.0 Flash for higher quality.
 * Offline or no key → falls back to the local rule-based simplifier.
 */
export default function HearingPage() {
  const { language, t } = useLanguage();
  const [input, setInput] = useState("");
  const [original, setOriginal] = useState("");
  const [simplified, setSimplified] = useState("");
  const [source, setSource] = useState<SimplifySource>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Phrase[]>([]);

  const handleSimplify = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setOriginal(trimmed);
    setSimplified("");
    setSource(null);
    setLoading(true);

    // Try Gemini first when online and configured.
    if (isGeminiConfigured && navigator.onLine) {
      try {
        const result = await simplifyWithGemini(trimmed, language);
        setSimplified(result);
        setSource("gemini");
        setSuggestions(suggestPhrases(trimmed, language));
        setLoading(false);
        return;
      } catch {
        // Fall through to local simplifier.
      }
    }

    // Offline / unconfigured / Gemini error → local rule-based.
    setSimplified(simplify(trimmed, language));
    setSource("local");
    setSuggestions(suggestPhrases(trimmed, language));
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 page-enter">
      <header>
        <h1 className="text-3xl font-black tracking-tight">
          {t("hearing.title")}
        </h1>
        <p className="mt-2 text-text-muted">{t("hearing.subtitle")}</p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="font-bold">{t("hearing.yourMessage")}</span>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          maxLength={500}
          placeholder={t("hearing.placeholder")}
          className="rounded-card border border-border bg-surface p-4 text-lg shadow-[var(--shadow)]"
        />
      </label>

      <button
        type="button"
        onClick={handleSimplify}
        disabled={!input.trim() || loading}
        className="flex min-h-12 items-center justify-center gap-2 rounded-button bg-bee-yellow px-6 text-lg font-black text-bee-black transition-colors hover:bg-bee-yellow-bright active:bg-bee-amber disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-bee-black border-t-transparent" />
            Simplifying…
          </>
        ) : (
          t("hearing.simplify")
        )}
      </button>

      {simplified && (
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-surface-alt p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {t("hearing.original")}
            </p>
            <p className="mt-1 text-lg">{original}</p>
          </div>

          <div className="rounded-card border-2 border-bee-yellow bg-surface p-4 shadow-[var(--shadow)]">
            {/* Source badge */}
            <div className="mb-3 flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t("hearing.simplified")}
              </p>
              {source === "gemini" ? (
                <span className="flex items-center gap-1 rounded-pill bg-bee-yellow/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bee-amber">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Gemini AI
                  <Wifi className="h-3 w-3 text-success" aria-hidden="true" />
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-pill bg-surface-alt px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                  <WifiOff className="h-3 w-3" aria-hidden="true" />
                  Offline
                </span>
              )}
            </div>
            <p className="text-2xl font-bold leading-snug">{simplified}</p>
          </div>

          {/* FSL visual placeholder for the simplified output */}
          <div className="hex-pattern flex h-20 items-center justify-center rounded-card border border-dashed border-border text-sm font-semibold text-text-muted">
            {t("comm.fslPlaceholder")}
          </div>

          <SpeakButton text={simplified} label={t("hearing.speakSimplified")} />

          {suggestions.length > 0 && (
            <section aria-labelledby="suggested">
              <h2 id="suggested" className="mb-2 font-extrabold">
                {t("hearing.suggested")}
              </h2>
              <ul className="flex flex-col gap-3">
                {suggestions.map((phrase) => (
                  <li key={phrase.id}>
                    <PhraseCard phrase={phrase} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
