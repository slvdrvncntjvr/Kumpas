import type { Language } from "@/i18n/translations";

/**
 * Maps the trained model's sign labels to spoken phrases in each language.
 * The model emits the labels in artifacts/<version>/model/labels.json. Keys
 * here are normalized (uppercase, straight apostrophe) for robust matching,
 * since the labels file uses a curly apostrophe in "DON'T UNDERSTAND".
 */
export const labelToPhrase: Record<string, Record<Language, string>> = {
  YES: { en: "Yes.", fil: "Oo." },
  NO: { en: "No.", fil: "Hindi." },
  DEAF: { en: "I am Deaf.", fil: "Bingi ako." },
  "THANK YOU": { en: "Thank you.", fil: "Salamat." },
  SLOW: { en: "Please slow down.", fil: "Pakibagalan." },
  "DON'T UNDERSTAND": {
    en: "I don't understand.",
    fil: "Hindi ko maintindihan.",
  },
  "MARRIAGE LICENSE": {
    en: "I need a marriage license.",
    fil: "Kailangan ko ng marriage license.",
  },
  "BARANGAY CLEARANCE": {
    en: "I need a barangay clearance.",
    fil: "Kailangan ko ng barangay clearance.",
  },
  "CERTIFICATE OF INDIGENCY": {
    en: "I need a certificate of indigency.",
    fil: "Kailangan ko ng certificate of indigency.",
  },
  "CERTIFICATE OF RESIDENCY": {
    en: "I need a certificate of residency.",
    fil: "Kailangan ko ng certificate of residency.",
  },
  CEDULA: {
    en: "I need a cedula.",
    fil: "Kailangan ko ng cedula.",
  },
  "BLOTTER REPORT": {
    en: "I need to file a blotter report.",
    fil: "Kailangan kong mag-file ng blotter report.",
  },
  AYUDA: {
    en: "I am asking for assistance (ayuda).",
    fil: "Humihingi ako ng ayuda.",
  },
  NO_SIGN: { en: "", fil: "" },
};

/** Normalize a model label so curly apostrophes match our straight-quote keys. */
function normalizeLabel(label: string): string {
  return label.replace(/[\u2018\u2019]/g, "'").trim().toUpperCase();
}

export const labels = Object.keys(labelToPhrase);

/** The background / no-sign class emits no phrase. */
export function isNoSign(label: string): boolean {
  return normalizeLabel(label) === "NO_SIGN";
}

export function phraseForLabel(label: string, language: Language = "en"): string {
  const key = normalizeLabel(label);
  return labelToPhrase[key]?.[language] ?? label;
}
