import type { AppLocale } from "@/lib/i18n/config";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
};

export type LegalTranslations = Record<AppLocale, LegalCopy>;
