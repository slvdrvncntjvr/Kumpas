"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useFontSize } from "@/components/FontSizeProvider";
import { useLanguage } from "@/i18n/LanguageProvider";
import { resetAndOnboard } from "@/services/storageService";
import { isSpeechSupported, speak } from "@/services/speechService";
import type { ThemePreference } from "@/services/storageService";
import type { Language } from "@/i18n/translations";

const APP_VERSION = "0.1.0 (demo)";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { language, setLanguage, t, speechLocale } = useLanguage();

  const handleClear = () => {
    if (window.confirm(t("settings.confirmClear"))) {
      // Clears all data and returns to the onboarding flow.
      resetAndOnboard();
    }
  };

  const handleRestartSetup = () => {
    if (window.confirm(t("settings.confirmRestart"))) {
      resetAndOnboard();
    }
  };

  const handleSpeechTest = () => {
    if (isSpeechSupported()) {
      void speak(t("settings.speechTestText"), speechLocale);
    }
  };

  const languages: Array<{ value: Language; labelKey: string }> = [
    { value: "en", labelKey: "settings.langEnglish" },
    { value: "fil", labelKey: "settings.langFilipino" },
  ];

  return (
    <div className="flex flex-col gap-8 page-enter">
      <h1 className="text-3xl font-black tracking-tight">
        {t("settings.title")}
      </h1>

      {/* Language toggle: EN ↔ FL */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("settings.language")}</h2>
        <div
          className="flex flex-nowrap w-full gap-2 pb-1"
          role="group"
          aria-label={t("settings.language")}
        >
          {languages.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value)}
              aria-pressed={language === option.value}
              className={`flex-1 min-w-0 whitespace-nowrap min-h-12 rounded-pill px-1 text-sm sm:text-base font-bold transition-colors ${
                language === option.value
                  ? "bg-bee-yellow text-bee-black"
                  : "border border-border bg-surface text-text hover:bg-surface-alt"
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("settings.theme")}</h2>
        <div className="flex flex-nowrap w-full gap-2 pb-1" role="group" aria-label={t("settings.theme")}>
          {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              aria-pressed={theme === option}
              className={`flex-1 min-w-0 whitespace-nowrap min-h-12 rounded-pill px-1 text-sm sm:text-base font-bold transition-colors ${
                theme === option
                  ? "bg-bee-yellow text-bee-black"
                  : "border border-border bg-surface text-text hover:bg-surface-alt"
              }`}
            >
              {t(`settings.${option}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Accessibility Font Size Selector */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("onb.textSize")}</h2>
        <div className="flex flex-nowrap w-full gap-2 pb-1" role="group" aria-label={t("onb.textSize")}>
          {(["normal", "large", "xlarge"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFontSize(option)}
              aria-pressed={fontSize === option}
              className={`flex-1 min-w-0 whitespace-nowrap min-h-12 rounded-pill px-1 text-sm sm:text-base font-bold transition-colors ${
                fontSize === option
                  ? "bg-bee-yellow text-bee-black"
                  : "border border-border bg-surface text-text hover:bg-surface-alt"
              }`}
            >
              {option === "normal"
                ? t("onb.sizeNormal")
                : option === "large"
                  ? t("onb.sizeLarge")
                  : t("onb.sizeXlarge")}
            </button>
          ))}
        </div>
      </section>


      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">
          {t("settings.emergencyProfile")}
        </h2>
        <Link
          href="/emergency"
          className="flex min-h-12 items-center justify-center rounded-button border-2 border-bee-black bg-surface px-6 text-lg font-bold transition-colors hover:bg-surface-alt"
        >
          {t("settings.editEmergencyProfile")}
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("settings.speech")}</h2>
        {language === "fil" && (
          <div className="flex items-start gap-2 rounded-button bg-warn/15 p-3 text-sm font-semibold text-[color:var(--bee-amber)]">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            <p>{t("settings.voiceWarning")}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleSpeechTest}
          className="flex min-h-12 items-center justify-center rounded-button bg-bee-yellow px-6 text-lg font-black text-bee-black transition-colors hover:bg-bee-yellow-bright"
        >
          {t("settings.testSpeech")}
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("settings.data")}</h2>
        <button
          type="button"
          onClick={handleRestartSetup}
          className="flex min-h-12 items-center justify-center gap-2 rounded-button border-2 border-bee-black bg-surface px-6 text-lg font-bold transition-colors hover:bg-surface-alt"
        >
          <RotateCcw aria-hidden="true" className="h-5 w-5" />
          {t("settings.restartSetup")}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex min-h-12 items-center justify-center rounded-button border-2 border-danger bg-surface px-6 text-lg font-bold text-danger transition-colors hover:bg-danger/10"
        >
          {t("settings.clearData")}
        </button>
      </section>

      <section className="flex flex-col gap-1 border-t border-border pt-4 text-sm text-text-muted">
        <p>{t("settings.tagline")}</p>
        <p>
          {t("settings.version")} {APP_VERSION}
        </p>
      </section>
    </div>
  );
}
