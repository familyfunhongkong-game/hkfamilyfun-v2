import { uiText, type AppLocale } from "@/lib/i18n/config";
import { CALENDAR_EVENT_ICONS } from "@/lib/events/calendar-icons";

function plainText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTagToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/^[{]+|[}]+$/g, "")
    .trim();
}

export function normalizeEventTags(value: unknown, limit = 8): string[] {
  if (!value || limit <= 0) return [];

  let values: unknown[] = [];

  if (Array.isArray(value)) {
    values = value;
  } else if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        values = parsed;
      } else if (typeof parsed === "string") {
        values = [parsed];
      }
    } catch {
      const unwrapped =
        text.startsWith("{") && text.endsWith("}")
          ? text.slice(1, -1)
          : text;
      values = unwrapped.split(/[,\n，、]/);
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of values) {
    const tag = cleanTagToken(item);
    if (!tag || seen.has(tag)) continue;

    seen.add(tag);
    result.push(tag);

    if (result.length >= limit) break;
  }

  return result;
}

export function formatEventCategory(
  value: unknown,
  locale: AppLocale,
): string {
  const raw = plainText(value) || "親子活動";
  const normalized = raw.toLowerCase();
  // New stable icon category IDs are stored on the same activity_category field.
  // Keep old free-form categories working without a data migration.
  const stableCategory = CALENDAR_EVENT_ICONS.find((icon) => icon.id === normalized);
  if (stableCategory) return uiText(locale, stableCategory.label, stableCategory.zhHans, stableCategory.en);


  const labels: Record<string, [string, string, string]> = {
    kids: ["親子活動", "亲子活动", "Family Activity"],
    parent_child: ["親子活動", "亲子活动", "Family Activity"],
    family: ["親子活動", "亲子活动", "Family Activity"],
    "親子活動": ["親子活動", "亲子活动", "Family Activity"],
    "亲子活动": ["親子活動", "亲子活动", "Family Activity"],
    workshop: ["工作坊", "工作坊", "Workshop"],
    "工作坊": ["工作坊", "工作坊", "Workshop"],
    market: ["市集", "市集", "Market"],
    "市集": ["市集", "市集", "Market"],
    exhibition: ["展覽", "展览", "Exhibition"],
    family_exhibition: ["親子展覽", "亲子展览", "Family Exhibition"],
    family_entertainment: ["親子娛樂", "亲子娱乐", "Family Entertainment"],
    cultural_event: ["文化活動", "文化活动", "Cultural Event"],
    digital_art: ["數碼藝術", "数码艺术", "Digital Art"],
    fair: ["嘉年華", "嘉年华", "Fair"],
    light_show: ["光影匯演", "光影汇演", "Light Show"],
    "展覽": ["展覽", "展览", "Exhibition"],
    "展览": ["展覽", "展览", "Exhibition"],
    festival: ["節慶活動", "节庆活动", "Festival"],
    "節慶活動": ["節慶活動", "节庆活动", "Festival"],
    "节庆活动": ["節慶活動", "节庆活动", "Festival"],
    education: ["教育活動", "教育活动", "Educational"],
    arts: ["藝術創作", "艺术创作", "Arts"],
    arts_event: ["文化藝術", "文化艺术", "Arts & Culture"],
    "文化藝術": ["文化藝術", "文化艺术", "Arts & Culture"],
    "文化艺术": ["文化藝術", "文化艺术", "Arts & Culture"],
    cooking: ["烹飪", "烹饪", "Cooking"],
    sports: ["運動", "运动", "Sports"],
    music: ["音樂", "音乐", "Music"],
    theatre: ["劇場", "剧场", "Theatre"],
    outdoor: ["戶外活動", "户外活动", "Outdoor"],
    indoor: ["室內活動", "室内活动", "Indoor"],
    mall: ["商場活動", "商场活动", "Mall Event"],
    sen: ["SEN 友善", "SEN 友善", "SEN Friendly"],
    free: ["免費活動", "免费活动", "Free Event"],
  };

  return labels[normalized]
    ? uiText(locale, ...labels[normalized])
    : raw;
}
