import type { AppLocale } from "@/lib/i18n/config";

const AGE_GROUP_TRANSLATIONS: Record<string, Record<AppLocale, string>> = {
  嬰幼兒: {
    "zh-Hant": "嬰幼兒",
    "zh-Hans": "婴幼儿",
    en: "Babies / toddlers",
  },
  幼兒: {
    "zh-Hant": "幼兒",
    "zh-Hans": "幼儿",
    en: "Preschool",
  },
  小學生: {
    "zh-Hant": "小學生",
    "zh-Hans": "小学生",
    en: "Primary school",
  },
  中學生: {
    "zh-Hant": "中學生",
    "zh-Hans": "中学生",
    en: "Secondary school",
  },
  親子家庭: {
    "zh-Hant": "親子家庭",
    "zh-Hans": "亲子家庭",
    en: "Families",
  },
  所有年齡: {
    "zh-Hant": "所有年齡",
    "zh-Hans": "所有年龄",
    en: "All ages",
  },
};

export function normalizeAgeGroups(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value !== "string") return [];
  const text = value.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    // Plain text list.
  }

  return text
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasAgeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function formatEventAge(
  {
    ageGroups,
    ageMin,
    ageMax,
    legacyAgeGroup,
  }: {
    ageGroups?: unknown;
    ageMin?: unknown;
    ageMax?: unknown;
    legacyAgeGroup?: unknown;
  },
  locale: AppLocale,
) {
  const groups = normalizeAgeGroups(ageGroups);
  if (groups.length > 0) {
    const translated = groups.map(
      (group) => AGE_GROUP_TRANSLATIONS[group]?.[locale] || group,
    );
    return translated.join(locale === "en" ? ", " : "、");
  }

  const minReady = hasAgeNumber(ageMin);
  const maxReady = hasAgeNumber(ageMax);
  const min = Number(ageMin);
  const max = Number(ageMax);

  const legacy = String(legacyAgeGroup ?? "").trim();

  if (locale === "en") {
    if (minReady && maxReady) return `Ages ${min}–${max}`;
    if (minReady) return `Ages ${min}+`;
    if (maxReady) return `Up to age ${max}`;
    if (legacy) return AGE_GROUP_TRANSLATIONS[legacy]?.en || legacy;
    return "Age TBC";
  }

  const suffix = locale === "zh-Hans" ? "岁" : "歲";
  if (minReady && maxReady) return `${min}–${max}${suffix}`;
  if (minReady) return `${min}${suffix}以上`;
  if (maxReady) return `${max}${suffix}或以下`;
  if (legacy) return AGE_GROUP_TRANSLATIONS[legacy]?.[locale] || legacy;
  return locale === "zh-Hans" ? "年龄待定" : "年齡待定";
}
