export type EventReadinessLevel = "critical" | "warning" | "good";

export type EventReadinessCheck = {
  key: string;
  label: string;
  done: boolean;
  level: EventReadinessLevel;
  note: string;
};

export type EventReadinessInput = {
  title?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  recurrenceType?: unknown;
  recurrenceWeekdays?: unknown;
  venueName?: unknown;
  address?: unknown;
  district?: unknown;
  imageCount?: number;
  priceReady?: boolean;
  ctaReady?: boolean;
  ageGroups?: unknown;
  ageMin?: unknown;
  ageMax?: unknown;
  organizerName?: unknown;
  mapReady?: boolean;
  description?: unknown;
};

function safeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") return "";
  return String(value).trim();
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  const raw = safeText(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    // Plain text list.
  }

  return raw
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasNumericAge(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function hasAgeInformation(input: Pick<
  EventReadinessInput,
  "ageGroups" | "ageMin" | "ageMax"
>) {
  return (
    textList(input.ageGroups).length > 0 ||
    hasNumericAge(input.ageMin) ||
    hasNumericAge(input.ageMax)
  );
}

export function evaluateEventReadiness(
  input: EventReadinessInput,
): {
  checks: EventReadinessCheck[];
  score: number;
  criticalMissing: string[];
  warningMissing: string[];
  publishReady: boolean;
  googleEventReady: boolean;
} {
  const titleReady = Boolean(safeText(input.title));
  const dateReady = Boolean(safeText(input.startDate));
  const recurrenceType = safeText(input.recurrenceType).toLowerCase();
  const recurrenceWeekdays = Array.isArray(input.recurrenceWeekdays)
    ? input.recurrenceWeekdays
    : [];
  const recurrenceReady =
    recurrenceType !== "weekly" ||
    (Boolean(safeText(input.endDate)) && recurrenceWeekdays.length > 0);

  const venueReady = Boolean(
    safeText(input.venueName) ||
      safeText(input.address) ||
      safeText(input.district),
  );
  const addressReady = Boolean(safeText(input.address));
  const imageReady = Number(input.imageCount || 0) > 0;
  const priceReady = Boolean(input.priceReady);
  const ctaReady = Boolean(input.ctaReady);
  const ageMinReady = hasNumericAge(input.ageMin);
  const ageMaxReady = hasNumericAge(input.ageMax);
  const ageRangeValid =
    !(ageMinReady && ageMaxReady) || Number(input.ageMax) >= Number(input.ageMin);
  const ageReady = hasAgeInformation(input) && ageRangeValid;
  const organizerReady = Boolean(safeText(input.organizerName));
  const mapReady = Boolean(input.mapReady);
  const descriptionReady = safeText(input.description).length >= 20;

  const checks: EventReadinessCheck[] = [
    {
      key: "title",
      label: "活動名稱",
      done: titleReady,
      level: "critical",
      note: "公開卡片、詳情頁及分享預覽都需要活動名稱。",
    },
    {
      key: "date",
      label: "活動日期",
      done: dateReady,
      level: "critical",
      note: "沒有開始日期不可提交或發布。",
    },
    {
      key: "recurrence",
      label: "重複日期",
      done: recurrenceReady,
      level: "critical",
      note: "每週活動必須有結束日期及至少一個星期。",
    },
    {
      key: "location",
      label: "場地 / 地區",
      done: venueReady,
      level: "critical",
      note: "家長至少要知道場地、地址或地區。",
    },
    {
      key: "address",
      label: "完整地址",
      done: addressReady,
      level: "critical",
      note: "實體活動需要完整地址；Google Event structured data 亦依賴真實地址。",
    },
    {
      key: "image",
      label: "活動封面",
      done: imageReady,
      level: "critical",
      note: "至少一張真實活動圖片，供卡片、詳情頁及社交分享使用。",
    },
    {
      key: "price",
      label: "收費",
      done: priceReady,
      level: "critical",
      note: "免費、固定價、價錢範圍或不顯示都可以，但不可保持待確認。",
    },
    {
      key: "cta",
      label: "報名 / CTA",
      done: ctaReady,
      level: "critical",
      note: "必須清楚說明報名、查詢、官方頁或無需報名。",
    },
    {
      key: "age",
      label: "適合年齡",
      done: ageReady,
      level: "critical",
      note: "HK Family Fun 卡片及搜尋需要年齡資料；可用年齡層或最小/最大年齡，且最大年齡不可小於最小年齡。",
    },
    {
      key: "organizer",
      label: "主辦方",
      done: organizerReady,
      level: "critical",
      note: "主辦方會顯示在公開詳情及 structured data。",
    },
    {
      key: "description",
      label: "活動內容",
      done: descriptionReady,
      level: "warning",
      note: "建議至少 20 個字，方便家長理解及搜尋引擎判斷內容。",
    },
    {
      key: "map",
      label: "Google Map",
      done: mapReady,
      level: "warning",
      note: "不是發布硬性條件，但有地圖會明顯改善家長到場體驗。",
    },
  ];

  const completed = checks.filter((item) => item.done).length;
  const score = Math.round((completed / checks.length) * 100);
  const criticalMissing = checks
    .filter((item) => item.level === "critical" && !item.done)
    .map((item) => item.label);
  const warningMissing = checks
    .filter((item) => item.level !== "critical" && !item.done)
    .map((item) => item.label);

  return {
    checks,
    score,
    criticalMissing,
    warningMissing,
    publishReady: criticalMissing.length === 0,
    // Google Event rich-result eligibility depends on a real title, date and
    // physical location. Image/organizer are also kept as quality gates here
    // so social previews and attribution remain trustworthy.
    googleEventReady:
      titleReady &&
      dateReady &&
      addressReady &&
      imageReady &&
      organizerReady,
  };
}
