"use client";

import { useEffect, useState } from "react";
import { loadProfile, saveProfile } from "@/services/storageService";
import { EmergencyProfileCard } from "@/components/EmergencyProfileCard";
import { SpeakButton } from "@/components/SpeakButton";
import { PhFlag } from "@/components/PhFlag";
import { Check } from "lucide-react";
import { toNationalDigits, isValidNationalNumber, formatNationalInput } from "@/utils/phone";
import type { UserProfile } from "@/types/userProfile";
import { useLanguage } from "@/i18n/LanguageProvider";

const EMPTY_PROFILE: UserProfile = {
  name: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  medicalNote: "",
  addressNote: "",
};

export default function EmergencyPage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
  const [loaded, setLoaded] = useState(false);

  const emergencyMessage = t("emergency.message");

  useEffect(() => {
    const saved = loadProfile();
    setProfile(saved);
    setDraft(saved ?? EMPTY_PROFILE);
    setEditing(!saved);
    setLoaded(true);
  }, []);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveProfile(draft);
    setProfile(draft);
    setEditing(false);
  };

  if (!loaded) {
    return <p className="text-text-muted">{t("common.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6 page-enter">
      <h1 className="text-3xl font-black tracking-tight">
        {t("emergency.title")}
      </h1>

      {/* Always-available emergency speech, even before a profile exists. */}
      <div className="rounded-card border-2 border-danger bg-surface p-5 shadow-[var(--shadow)]">
        <p className="text-lg font-bold">{emergencyMessage}</p>
        <SpeakButton
          text={emergencyMessage}
          label={t("emergency.speakMessage")}
          className="mt-4 w-full"
        />
      </div>

      {profile && !editing ? (
        <>
          <EmergencyProfileCard profile={profile} />

          {/* Share emergency card */}
          <button
            type="button"
            onClick={async () => {
              const shareText = [
                "I AM DEAF / BINGI AKO",
                profile.name ? `Name: ${profile.name}` : "",
                profile.emergencyContactName || profile.emergencyContactNumber
                  ? `Contact: ${profile.emergencyContactName} ${profile.emergencyContactNumber}`.trim()
                  : "",
                profile.medicalNote ? `Medical: ${profile.medicalNote}` : "",
                profile.addressNote ? `Address: ${profile.addressNote}` : "",
              ]
                .filter(Boolean)
                .join("\n");

              if (navigator.share) {
                try {
                  await navigator.share({ text: shareText });
                } catch {
                  // cancelled — ignore
                }
              } else {
                await navigator.clipboard?.writeText(shareText).catch(() => {});
              }
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-button border-2 border-bee-black bg-surface px-6 text-base font-bold transition-colors hover:bg-surface-alt"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share emergency card
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft(profile);
              setEditing(true);
            }}
            className="flex min-h-12 items-center justify-center rounded-button border-2 border-bee-black bg-surface px-6 text-lg font-bold transition-colors hover:bg-surface-alt"
          >
            {t("emergency.editProfile")}
          </button>
        </>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold">
            {profile ? t("emergency.editTitle") : t("emergency.setupTitle")}
          </h2>
          <Field
            label={t("emergency.name")}
            value={draft.name}
            onChange={(value) => setDraft({ ...draft, name: value })}
          />
          <Field
            label={t("emergency.contactName")}
            value={draft.emergencyContactName}
            onChange={(value) =>
              setDraft({ ...draft, emergencyContactName: value })
            }
          />
          <ContactField
            label={t("emergency.contactNumber")}
            value={draft.emergencyContactNumber}
            onChange={(value) =>
              setDraft({ ...draft, emergencyContactNumber: value })
            }
            t={t}
          />
          <Field
            label={t("emergency.medicalNote")}
            value={draft.medicalNote}
            onChange={(value) => setDraft({ ...draft, medicalNote: value })}
          />
          <Field
            label={t("emergency.addressNote")}
            value={draft.addressNote}
            onChange={(value) => setDraft({ ...draft, addressNote: value })}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex min-h-12 flex-1 items-center justify-center rounded-button bg-bee-yellow px-6 text-lg font-black text-bee-black transition-colors hover:bg-bee-yellow-bright"
            >
              {t("emergency.saveProfile")}
            </button>
            {profile && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex min-h-12 items-center justify-center rounded-button border-2 border-bee-black bg-surface px-6 text-lg font-bold"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );

}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-bold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-button border border-border bg-surface px-4 text-lg shadow-[var(--shadow)]"
      />
    </label>
  );
}

function ContactField({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  t: (k: string) => string;
}) {
  const contact = toNationalDigits(value);
  const complete = contact.length === 10;
  const validNumber = isValidNationalNumber(contact);
  const showError = complete && !validNumber;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    const number = isValidNationalNumber(digits) ? `+63${digits}` : digits;
    onChange(number);
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-bold">{label}</span>
      <div
        className={`flex min-h-12 items-center gap-2 rounded-button border bg-surface pl-3 pr-4 shadow-[var(--shadow)] focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-bee-yellow-bright ${
          showError
            ? "border-danger"
            : validNumber
              ? "border-success"
              : "border-border"
        }`}
      >
        <span className="flex shrink-0 items-center gap-1.5 border-r border-border pr-2 font-bold">
          <PhFlag className="h-4 w-6 rounded-[2px]" />
          +63
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={formatNationalInput(contact)}
          onChange={handleChange}
          autoComplete="tel-national"
          placeholder="9XX XXX XXXX"
          aria-invalid={showError}
          style={{ outline: "none", boxShadow: "none" }}
          className="min-w-0 flex-1 border-0 bg-transparent px-5 py-2 text-lg tracking-wide"
        />
      </div>
      <span className="min-h-5 text-sm font-semibold">
        {validNumber ? (
          <span className="flex items-center gap-1.5 text-success">
            <Check aria-hidden="true" className="h-4 w-4" />
            {t("onb.contactValid")}
          </span>
        ) : showError ? (
          <span className="text-danger">{t("onb.contactInvalid")}</span>
        ) : (
          <span className="text-text-muted">{t("onb.contactHint")}</span>
        )}
      </span>
    </label>
  );
}
