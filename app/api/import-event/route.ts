import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 12 * 1024 * 1024;
const TINYFISH_FETCH_URL = "https://api.fetch.tinyfish.ai";
const JINA_READER_BASE_URL = "https://r.jina.ai/";

type ExtractedEvent = {
  source_url: string;
  title_tc: string;
  short_description_tc: string;
  description_tc: string;
  activity_category: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  address: string;
  area: string;
  district: string;
  mtr_station: string;
  price_display_mode: string;
  price_label: string;
  min_price: string;
  max_price: string;
  original_price: string;
  offer_price: string;
  quota_label: string;
  cta_type: string;
  cta_label: string;
  registration_url: string;
  booking_url: string;
  official_url: string;
  google_map_url: string;
  google_map_embed_url: string;
  cover_image_url: string;
  gallery_image_urls: string[];
  organizer_name: string;
  tags: string;
  highlights: string;
  terms: string;
  remarks: string;
  extraction_notes: string[];
};

type TinyFishPage = {
  url?: string;
  final_url?: string;
  title?: string | null;
  description?: string | null;
  language?: string | null;
  text?: string | null;
  links?: string[];
  image_links?: string[];
};

type TinyFishResponse = {
  results?: TinyFishPage[];
  errors?: Array<{
    url?: string;
    error?: string;
    status?: number;
    message?: string;
  }>;
};

function emptyEvent(url: string): ExtractedEvent {
  return {
    source_url: url,
    title_tc: "",
    short_description_tc: "",
    description_tc: "",
    activity_category: "親子活動",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    venue_name: "",
    address: "",
    area: "",
    district: "",
    mtr_station: "",
    price_display_mode: "unknown",
    price_label: "",
    min_price: "",
    max_price: "",
    original_price: "",
    offer_price: "",
    quota_label: "",
    cta_type: "official",
    cta_label: "活動官網查看更多",
    registration_url: "",
    booking_url: "",
    official_url: url,
    google_map_url: "",
    google_map_embed_url: "",
    cover_image_url: "",
    gallery_image_urls: [],
    organizer_name: "",
    tags: "",
    highlights: "",
    terms: "",
    remarks:
      "資料由活動網址智能匯入，請商戶檢查日期、地點、收費、名額及報名安排。",
    extraction_notes: [],
  };
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function normalizeDocumentText(value: unknown) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToDocumentText(html: string) {
  return normalizeDocumentText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(
        /<\/(?:p|div|section|article|li|h1|h2|h3|h4|h5|h6|tr|br)>/gi,
        "\n"
      )
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
  );
}

function absoluteUrl(value: string, baseUrl: string) {
  const text = value.trim();
  if (!text) return "";

  try {
    return new URL(text, baseUrl).toString();
  } catch {
    return text;
  }
}

function getMeta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtml(match[1]);
    }
  }

  return "";
}

function getTitle(html: string) {
  const ogTitle = getMeta(html, ["og:title", "twitter:title"]);
  if (ogTitle) return ogTitle;

  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? cleanText(match[1]) : "";
}

function getDescription(html: string) {
  return getMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
}

function getImage(html: string, baseUrl: string) {
  const image = getMeta(html, [
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);

  return image ? absoluteUrl(image, baseUrl) : "";
}

function extractJsonLd(html: string) {
  const scripts = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  );

  const results: unknown[] = [];

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (
        parsed &&
        typeof parsed === "object" &&
        "@graph" in parsed &&
        Array.isArray((parsed as { "@graph"?: unknown[] })["@graph"])
      ) {
        results.push(
          ...(((parsed as { "@graph"?: unknown[] })["@graph"]) || [])
        );
      } else {
        results.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return results;
}

function findEventJsonLd(items: unknown[]) {
  return items.find((item) => {
    if (!item || typeof item !== "object") return false;

    const type = (item as Record<string, unknown>)["@type"];

    if (Array.isArray(type)) {
      return type.some((entry) =>
        String(entry).toLowerCase().includes("event")
      );
    }

    return String(type || "")
      .toLowerCase()
      .includes("event");
  }) as Record<string, any> | undefined;
}

function dateOnly(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";

  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];

  const slash = text.match(
    /(\d{4})\s*[/.年-]\s*(\d{1,2})\s*[/.月-]\s*(\d{1,2})/
  );

  if (slash) {
    return `${slash[1]}-${slash[2].padStart(2, "0")}-${slash[3].padStart(
      2,
      "0"
    )}`;
  }

  return "";
}

function timeOnly(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";

  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function ymd(year: string, month: string, day: string) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const ENGLISH_MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const ENGLISH_MONTH_PATTERN =
  "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

function englishMonthNumber(value: string) {
  return ENGLISH_MONTHS[value.trim().toLowerCase()] || "";
}

function extractEnglishDateRange(text: string) {
  const normalized = normalizeDocumentText(text);

  const monthFirstRange = normalized.match(
    new RegExp(
      `${ENGLISH_MONTH_PATTERN}\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\s*(?:to|until|through|－|-|–|—|~|～)\\s*${ENGLISH_MONTH_PATTERN}\\s+(\\d{1,2}),?\\s+(\\d{4})`,
      "i"
    )
  );

  if (monthFirstRange) {
    const startMonth = englishMonthNumber(monthFirstRange[1]);
    const startDay = monthFirstRange[2];
    const startYear = monthFirstRange[3] || monthFirstRange[6];
    const endMonth = englishMonthNumber(monthFirstRange[4]);
    const endDay = monthFirstRange[5];
    const endYear = monthFirstRange[6];

    if (startMonth && endMonth) {
      return {
        start_date: ymd(startYear, startMonth, startDay),
        end_date: ymd(endYear, endMonth, endDay),
      };
    }
  }

  const dayFirstRange = normalized.match(
    new RegExp(
      `(\\d{1,2})\\s+${ENGLISH_MONTH_PATTERN}(?:,?\\s+(\\d{4}))?\\s*(?:to|until|through|－|-|–|—|~|～)\\s*(\\d{1,2})\\s+${ENGLISH_MONTH_PATTERN},?\\s+(\\d{4})`,
      "i"
    )
  );

  if (dayFirstRange) {
    const startDay = dayFirstRange[1];
    const startMonth = englishMonthNumber(dayFirstRange[2]);
    const startYear = dayFirstRange[3] || dayFirstRange[6];
    const endDay = dayFirstRange[4];
    const endMonth = englishMonthNumber(dayFirstRange[5]);
    const endYear = dayFirstRange[6];

    if (startMonth && endMonth) {
      return {
        start_date: ymd(startYear, startMonth, startDay),
        end_date: ymd(endYear, endMonth, endDay),
      };
    }
  }

  const monthFirstSingle = normalized.match(
    new RegExp(`${ENGLISH_MONTH_PATTERN}\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i")
  );

  if (monthFirstSingle) {
    const month = englishMonthNumber(monthFirstSingle[1]);
    if (month) {
      const single = ymd(monthFirstSingle[3], month, monthFirstSingle[2]);
      return { start_date: single, end_date: single };
    }
  }

  const dayFirstSingle = normalized.match(
    new RegExp(`(\\d{1,2})\\s+${ENGLISH_MONTH_PATTERN},?\\s+(\\d{4})`, "i")
  );

  if (dayFirstSingle) {
    const month = englishMonthNumber(dayFirstSingle[2]);
    if (month) {
      const single = ymd(dayFirstSingle[3], month, dayFirstSingle[1]);
      return { start_date: single, end_date: single };
    }
  }

  return { start_date: "", end_date: "" };
}

function extractDateRangeFromText(text: string) {
  const normalized = normalizeDocumentText(text);
  const englishRange = extractEnglishDateRange(normalized);

  if (englishRange.start_date) {
    return englishRange;
  }

  const chineseSameYear = normalized.match(
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?\s*(?:至|到|－|-|–|—|~|～)\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/
  );

  if (chineseSameYear) {
    return {
      start_date: ymd(
        chineseSameYear[1],
        chineseSameYear[2],
        chineseSameYear[3]
      ),
      end_date: ymd(
        chineseSameYear[1],
        chineseSameYear[4],
        chineseSameYear[5]
      ),
    };
  }

  const chineseSameMonth = normalized.match(
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?\s*(?:至|到|－|-|–|—|~|～)\s*(\d{1,2})\s*日/
  );

  if (chineseSameMonth) {
    return {
      start_date: ymd(
        chineseSameMonth[1],
        chineseSameMonth[2],
        chineseSameMonth[3]
      ),
      end_date: ymd(
        chineseSameMonth[1],
        chineseSameMonth[2],
        chineseSameMonth[4]
      ),
    };
  }

  const chineseFullRange = normalized.match(
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?\s*(?:至|到|－|-|–|—|~|～)\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/
  );

  if (chineseFullRange) {
    return {
      start_date: ymd(
        chineseFullRange[1],
        chineseFullRange[2],
        chineseFullRange[3]
      ),
      end_date: ymd(
        chineseFullRange[4],
        chineseFullRange[5],
        chineseFullRange[6]
      ),
    };
  }

  const isoRange = normalized.match(
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2}).{0,24}?(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/
  );

  if (isoRange) {
    return {
      start_date: ymd(isoRange[1], isoRange[2], isoRange[3]),
      end_date: ymd(isoRange[4], isoRange[5], isoRange[6]),
    };
  }

  const numericSameYear = normalized.match(
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*(?:至|到|－|-|–|—|~|～)\s*(\d{1,2})[-/.](\d{1,2})/
  );

  if (numericSameYear) {
    return {
      start_date: ymd(
        numericSameYear[1],
        numericSameYear[2],
        numericSameYear[3]
      ),
      end_date: ymd(
        numericSameYear[1],
        numericSameYear[4],
        numericSameYear[5]
      ),
    };
  }

  const compactRange = normalized.match(
    /(\d{2})[./-](\d{2})[./-](\d{4}).{0,20}?(\d{2})[./-](\d{2})[./-](\d{4})/
  );

  if (compactRange) {
    return {
      start_date: ymd(
        compactRange[3],
        compactRange[2],
        compactRange[1]
      ),
      end_date: ymd(
        compactRange[6],
        compactRange[5],
        compactRange[4]
      ),
    };
  }

  const oneDate = dateOnly(normalized);

  return {
    start_date: oneDate,
    end_date: oneDate,
  };
}

function to24Hour(period: string, hourText: string, minuteText?: string) {
  let hour = Number(hourText);
  const minute = Number(minuteText || "0");
  const label = period.trim();

  if (/下午|晚上|pm/i.test(label)) {
    if (hour < 12) hour += 12;
  } else if (/上午|早上|am/i.test(label)) {
    if (hour === 12) hour = 0;
  } else if (/中午/.test(label)) {
    if (hour < 12) hour += 12;
  }

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0"
  )}`;
}

function extractTimeRangeFromText(text: string) {
  const normalized = normalizeDocumentText(text);

  const chinese = normalized.match(
    /(上午|早上|中午|下午|晚上)?\s*(\d{1,2})\s*(?:時|點)\s*(?:(\d{1,2})\s*分)?\s*(?:正)?\s*(?:至|到|－|-|–|—|~|～)\s*(上午|早上|中午|下午|晚上)?\s*(\d{1,2})\s*(?:時|點)\s*(?:(\d{1,2})\s*分)?\s*(?:正)?/
  );

  if (chinese) {
    const startPeriod = chinese[1] || "";
    const endPeriod = chinese[4] || startPeriod;

    return {
      start_time: to24Hour(startPeriod, chinese[2], chinese[3]),
      end_time: to24Hour(endPeriod, chinese[5], chinese[6]),
    };
  }

  const amPm = normalized.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:至|to|到|－|-|–|—|~|～)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );

  if (amPm) {
    return {
      start_time: to24Hour(amPm[3], amPm[1], amPm[2]),
      end_time: to24Hour(amPm[6], amPm[4], amPm[5]),
    };
  }

  const twentyFour = normalized.match(
    /(\d{1,2}):(\d{2})\s*(?:至|to|到|－|-|–|—|~|～)\s*(\d{1,2}):(\d{2})/i
  );

  if (twentyFour) {
    return {
      start_time: `${twentyFour[1].padStart(2, "0")}:${twentyFour[2]}`,
      end_time: `${twentyFour[3].padStart(2, "0")}:${twentyFour[4]}`,
    };
  }

  return {
    start_time: "",
    end_time: "",
  };
}

function extractPrices(text: string) {
  const normalized = normalizeDocumentText(text);
  const clearlyFree =
    /免費入場|免費參觀|免費開放|free admission|free entry|admission is free/i.test(
      normalized
    );
  const explicitPaidAdmission =
    /票價|門票|參加費|收費|ticket price|admission fee|entry fee/i.test(
      normalized
    );

  if (clearlyFree && !explicitPaidAdmission) {
    return {
      price_display_mode: "free",
      price_label: "免費",
      min_price: "",
      max_price: "",
      offer_price: "",
      original_price: "",
    };
  }

  const currencyPrices = Array.from(
    normalized.matchAll(
      /(?:HK\s*\$?|HKD\s*|港幣\s*|港元\s*|\$\s*)(\d{1,5}(?:\.\d{1,2})?)/gi
    )
  ).map((match) => match[1]);

  const prices = Array.from(
    new Set(currencyPrices.map((item) => Number(item)))
  )
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b);

  if (!prices.length) {
    if (/免費|free admission|free entry|free\b/i.test(text)) {
      return {
        price_display_mode: "free",
        price_label: "免費",
        min_price: "",
        max_price: "",
        offer_price: "",
        original_price: "",
      };
    }

    return null;
  }

  const hasEarlyBird = /早鳥|early bird|優惠/i.test(text);
  const hasOriginal = /原價|original/i.test(text);

  if (hasEarlyBird && prices.length >= 2) {
    return {
      price_display_mode: "early_bird",
      price_label: `早鳥優惠價 HK$${prices[0]}（原價 HK$${
        prices[prices.length - 1]
      }）`,
      min_price: String(prices[0]),
      max_price: String(prices[0]),
      offer_price: String(prices[0]),
      original_price: String(prices[prices.length - 1]),
    };
  }

  if (prices.length >= 2) {
    return {
      price_display_mode: "range",
      price_label: `HK$${prices[0]}–HK$${prices[prices.length - 1]}`,
      min_price: String(prices[0]),
      max_price: String(prices[prices.length - 1]),
      offer_price: "",
      original_price: hasOriginal
        ? String(prices[prices.length - 1])
        : "",
    };
  }

  return {
    price_display_mode: "fixed",
    price_label: `HK$${prices[0]}`,
    min_price: String(prices[0]),
    max_price: String(prices[0]),
    offer_price: "",
    original_price: "",
  };
}

function extractVenueFromText(text: string) {
  const normalized = normalizeDocumentText(text);

  const venueLine = normalized.match(
    /(?:活動地點|開放地點|地點|Venue|Location)\s*[:：]\s*([^\n]{2,100})/i
  );

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const locationHeaderIndex = lines.findIndex((line) =>
    /^(活動地點|開放地點|地點|Venue|Location)$/i.test(line)
  );

  const nextLineVenue =
    locationHeaderIndex >= 0 &&
    lines[locationHeaderIndex + 1] &&
    !/^(DATE|DATE AND TIME|TIME|PRICE|LANGUAGE|TERMS|活動日期|活動時間|收費)$/i.test(
      lines[locationHeaderIndex + 1]
    )
      ? lines[locationHeaderIndex + 1]
      : "";

  const venueName =
    venueLine?.[1]?.trim() ||
    nextLineVenue ||
    "";

  if (/AIRSIDE/i.test(normalized)) {
    return {
      venue_name: venueName || "AIRSIDE",
      address: venueName
        ? `啟德 ${venueName}`
        : "啟德 AIRSIDE",
      area: "九龍",
      district: "九龍城區",
      mtr_station: "啟德",
    };
  }

  if (/MegaBox/i.test(normalized)) {
    return {
      venue_name: venueName || "MegaBox",
      address: venueName
        ? `九龍灣 ${venueName}`
        : "九龍灣 MegaBox",
      area: "九龍",
      district: "觀塘區",
      mtr_station: "九龍灣",
    };
  }

  if (/新城市廣場|New Town Plaza/i.test(normalized)) {
    return {
      venue_name: venueName || "新城市廣場",
      address: venueName
        ? `沙田 ${venueName}`
        : "沙田新城市廣場",
      area: "新界",
      district: "沙田區",
      mtr_station: "沙田",
    };
  }

  if (/啟德/i.test(normalized)) {
    return {
      venue_name: venueName,
      address: venueName ? `啟德 ${venueName}` : "",
      area: "九龍",
      district: "九龍城區",
      mtr_station: "啟德",
    };
  }

  if (/九龍灣/i.test(normalized)) {
    return {
      venue_name: venueName,
      address: venueName ? `九龍灣 ${venueName}` : "",
      area: "九龍",
      district: "觀塘區",
      mtr_station: "九龍灣",
    };
  }

  if (/沙田/i.test(normalized)) {
    return {
      venue_name: venueName,
      address: venueName ? `沙田 ${venueName}` : "",
      area: "新界",
      district: "沙田區",
      mtr_station: "沙田",
    };
  }

  return {
    venue_name: venueName,
    address: "",
    area: "",
    district: "",
    mtr_station: "",
  };
}

function extractPrimaryEventSection(text: string) {
  const lines = normalizeDocumentText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const detailIndexes = lines
    .map((line, index) =>
      /活動詳情|event details/i.test(line) ? index : -1
    )
    .filter((index) => index >= 0);

  if (detailIndexes.length) {
    const start = Math.max(0, detailIndexes[0] - 1);
    const next = detailIndexes[1] ?? Math.min(lines.length, start + 22);
    return lines.slice(start, next).join("\n");
  }

  return lines.slice(0, 80).join("\n");
}

function extractDocumentTitle(text: string) {
  const lines = normalizeDocumentText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const detailTitle = lines.find((line) => /活動詳情/.test(line));

  if (detailTitle) {
    const stripped = detailTitle
      .replace(/\s*活動詳情.*$/i, "")
      .trim();

    if (stripped.length >= 4) return stripped;
  }

  const candidates = lines
    .filter(
      (line) =>
        line.length >= 6 &&
        line.length <= 180 &&
        !/^(新聞稿|請即發布|下載高清相片|press release)$/i.test(line) &&
        !/^(URL Source|Published Time|Markdown Content|Author|Date)\s*:/i.test(
          line
        )
    )
    .map((line) =>
      line
        .replace(/^Title\s*:\s*/i, "")
        .replace(/^#\s+/, "")
        .trim()
    )
    .filter(Boolean);

  return (
    candidates.find((line) =>
      /活動|派對|工作坊|嘉年華|市集|展覽|festival|workshop|event|AIRSIDE|SpongeBob|海綿寶寶/i.test(
        line
      )
    ) ||
    candidates[0] ||
    ""
  );
}

function extractDocumentSummary(text: string) {
  const normalized = normalizeDocumentText(text);

  const datelineIndex = normalized.search(/【香港[^】]*】/);

  if (datelineIndex >= 0) {
    const afterDateline = normalized
      .slice(datelineIndex)
      .replace(/^【香港[^】]*】\s*/, "");

    const paragraph = afterDateline
      .split(/\n\s*\n|\n(?=[^\n]{0,40}(?:活動詳情|打卡|體驗|工作坊|換領|期間限定))/)[0]
      ?.trim();

    if (paragraph) {
      return cleanText(paragraph).slice(0, 1200);
    }
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(新聞稿|請即發布|下載高清相片|press release)$/i.test(line)
    );

  return cleanText(lines.slice(1, 8).join(" ")).slice(0, 1200);
}

function extractRegistrationUrl(text: string) {
  const match = normalizeDocumentText(text).match(
    /(?:報名連結|報名網址|booking url|registration url)\s*[:：]?\s*(https?:\/\/[^\s)）>]+)/i
  );

  return match?.[1]
    ? match[1].replace(/[，。；;,]+$/, "")
    : "";
}

function extractOfficialUrl(text: string) {
  const urls = Array.from(
    normalizeDocumentText(text).matchAll(/https?:\/\/[^\s)）>]+/gi)
  )
    .map((match) => match[0].replace(/[，。；;,]+$/, ""))
    .filter(Boolean);

  return (
    urls.find((url) =>
      /airside\.com\.hk\/(?:happenings|event)\//i.test(url)
    ) ||
    urls.find((url) =>
      /\/(?:happenings|event)\//i.test(url)
    ) ||
    ""
  );
}

function deriveTags(text: string) {
  const normalized = normalizeDocumentText(text);
  const tags: string[] = [];

  const rules: Array<[RegExp, string]> = [
    [/AIRSIDE/i, "AIRSIDE"],
    [/海綿寶寶|SpongeBob/i, "海綿寶寶"],
    [/復活節|Easter/i, "復活節"],
    [/工作坊|workshop/i, "工作坊"],
    [/親子|小朋友|kids?|family/i, "親子"],
    [/免費|free/i, "免費"],
  ];

  for (const [pattern, tag] of rules) {
    if (pattern.test(normalized) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 8).join(", ");
}

function applyJsonLd(
  event: ExtractedEvent,
  jsonLdEvent: Record<string, any> | undefined,
  url: string
) {
  if (!jsonLdEvent) return event;

  const location =
    jsonLdEvent.location && typeof jsonLdEvent.location === "object"
      ? jsonLdEvent.location
      : {};

  const offers = Array.isArray(jsonLdEvent.offers)
    ? jsonLdEvent.offers[0]
    : jsonLdEvent.offers || {};

  const imageValue = Array.isArray(jsonLdEvent.image)
    ? jsonLdEvent.image[0]
    : jsonLdEvent.image;

  return {
    ...event,
    title_tc: event.title_tc || cleanText(jsonLdEvent.name),
    short_description_tc:
      event.short_description_tc ||
      cleanText(jsonLdEvent.description).slice(0, 160),
    description_tc:
      event.description_tc || cleanText(jsonLdEvent.description),
    start_date: event.start_date || dateOnly(jsonLdEvent.startDate),
    end_date:
      event.end_date ||
      dateOnly(jsonLdEvent.endDate || jsonLdEvent.startDate),
    start_time:
      event.start_time || timeOnly(jsonLdEvent.startDate),
    end_time: event.end_time || timeOnly(jsonLdEvent.endDate),
    venue_name:
      event.venue_name || cleanText(location.name),
    address:
      event.address ||
      cleanText(
        typeof location.address === "string"
          ? location.address
          : [
              location.address?.streetAddress,
              location.address?.addressLocality,
              location.address?.addressRegion,
            ]
              .filter(Boolean)
              .join(" ")
      ),
    cover_image_url:
      event.cover_image_url ||
      absoluteUrl(String(imageValue || ""), url),
    registration_url:
      event.registration_url ||
      absoluteUrl(
        String(offers.url || jsonLdEvent.url || ""),
        url
      ),
    official_url: event.official_url || url,
  };
}

function applyTextExtraction(
  currentEvent: ExtractedEvent,
  documentText: string,
  options?: {
    title?: string;
    description?: string;
    imageLinks?: string[];
    sourceLabel?: string;
  }
) {
  const normalized = normalizeDocumentText(documentText);

  if (!normalized) return currentEvent;

  const detailSectionCount =
    normalized.match(/活動詳情|event details/gi)?.length || 0;

  const primarySection = extractPrimaryEventSection(normalized);
  const title =
    cleanText(options?.title) ||
    extractDocumentTitle(normalized);

  const summary =
    cleanText(options?.description) ||
    extractDocumentSummary(normalized);

  const dateRange = extractDateRangeFromText(primarySection);
  const fallbackDateRange = extractDateRangeFromText(normalized);

  const timeRange = extractTimeRangeFromText(primarySection);
  const venue = extractVenueFromText(primarySection || normalized);
  const fallbackVenue = extractVenueFromText(normalized);
  const price = extractPrices(primarySection);
  const registrationUrl = extractRegistrationUrl(primarySection);
  const extractedOfficialUrl = extractOfficialUrl(normalized);

  const normalizedImages = Array.from(
    new Set(
      (options?.imageLinks || [])
        .map((image) => String(image || "").trim())
        .filter((image) => /^https?:\/\//i.test(image))
    )
  ).slice(0, 6);

  const event: ExtractedEvent = {
    ...currentEvent,
    title_tc: currentEvent.title_tc || title,
    short_description_tc:
      currentEvent.short_description_tc ||
      summary.slice(0, 160),
    description_tc:
      currentEvent.description_tc ||
      summary ||
      cleanText(normalized).slice(0, 1200),
    start_date:
      currentEvent.start_date ||
      dateRange.start_date ||
      fallbackDateRange.start_date,
    end_date:
      currentEvent.end_date ||
      dateRange.end_date ||
      fallbackDateRange.end_date,
    start_time:
      currentEvent.start_time || timeRange.start_time,
    end_time:
      currentEvent.end_time || timeRange.end_time,
    venue_name:
      currentEvent.venue_name ||
      venue.venue_name ||
      fallbackVenue.venue_name,
    address:
      currentEvent.address ||
      venue.address ||
      fallbackVenue.address,
    area:
      currentEvent.area ||
      venue.area ||
      fallbackVenue.area,
    district:
      currentEvent.district ||
      venue.district ||
      fallbackVenue.district,
    mtr_station:
      currentEvent.mtr_station ||
      venue.mtr_station ||
      fallbackVenue.mtr_station,
    registration_url:
      currentEvent.registration_url || registrationUrl,
    booking_url:
      currentEvent.booking_url || registrationUrl,
    official_url:
      extractedOfficialUrl || currentEvent.official_url,
    cover_image_url:
      currentEvent.cover_image_url ||
      normalizedImages[0] ||
      "",
    gallery_image_urls: Array.from(
      new Set([
        ...currentEvent.gallery_image_urls,
        ...normalizedImages,
      ])
    ).slice(0, 6),
    tags: currentEvent.tags || deriveTags(normalized),
  };

  if (registrationUrl) {
    event.cta_type = "registration";
    event.cta_label = "立即報名";
  }

  if (price) {
    event.price_display_mode = price.price_display_mode;
    event.price_label = price.price_label;
    event.min_price = price.min_price;
    event.max_price = price.max_price;
    event.offer_price = price.offer_price;
    event.original_price = price.original_price;
  }

  if (options?.sourceLabel) {
    event.extraction_notes.push(options.sourceLabel);
  }

  if (detailSectionCount > 1) {
    event.extraction_notes.push(
      `偵測到 ${detailSectionCount} 個活動資料區塊。新聞稿可能包含多個子活動，本草稿先以主要活動區塊預填，請商戶確認是否需要拆成多個活動。`
    );
  }

  return event;
}

async function fetchWithJinaReader(url: string) {
  try {
    const response = await fetch(
      `${JINA_READER_BASE_URL}${url}`,
      {
        method: "GET",
        headers: {
          accept: "text/plain",
          "user-agent":
            "HKFamilyFun/2.0 (+https://www.hkfamilyfun.com)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(18000),
      }
    );

    if (!response.ok) {
      return {
        ok: false as const,
        error: `Jina Reader 回應 ${response.status}，免費智能文件解析暫時未完成。`,
      };
    }

    const rawText = await response.text();
    const text = normalizeDocumentText(rawText);

    if (!text || text.length < 40) {
      return {
        ok: false as const,
        error: "Jina Reader 未能抽取足夠活動資料。",
      };
    }

    const imageLinks = Array.from(
      rawText.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi)
    )
      .map((match) => match[1])
      .filter(Boolean)
      .slice(0, 12);

    return {
      ok: true as const,
      text,
      imageLinks,
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? `Jina Reader 失敗：${error.message}`
          : "Jina Reader 失敗。",
    };
  }
}

async function fetchWithTinyFish(url: string) {
  const apiKey = process.env.TINYFISH_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false as const,
      unavailable: true as const,
      error:
        "PDF / 動態網站智能抽取尚未啟用。請管理員在 Vercel 設定 TINYFISH_API_KEY。",
    };
  }

  try {
    const response = await fetch(TINYFISH_FETCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        urls: [url],
        format: "markdown",
        links: true,
        image_links: true,
        ttl: 0,
        per_url_timeout_ms: 20000,
        purpose:
          "Extract official Hong Kong family event information including event title, dates, opening times, venue, fees and registration details.",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      return {
        ok: false as const,
        unavailable: false as const,
        error: `TinyFish Fetch 回應 ${response.status}，智能抽取暫時未完成。`,
      };
    }

    const payload = (await response.json()) as TinyFishResponse;
    const result = payload.results?.[0];

    if (!result?.text) {
      const firstError = payload.errors?.[0];

      return {
        ok: false as const,
        unavailable: false as const,
        error: firstError?.error
          ? `TinyFish Fetch 未能讀取來源：${firstError.error}`
          : "TinyFish Fetch 未能抽取可用文字。",
      };
    }

    return {
      ok: true as const,
      unavailable: false as const,
      text: normalizeDocumentText(result.text),
      title: cleanText(result.title),
      description: cleanText(result.description),
      imageLinks: result.image_links || [],
      links: result.links || [],
      finalUrl: result.final_url || url,
    };
  } catch (error) {
    return {
      ok: false as const,
      unavailable: false as const,
      error:
        error instanceof Error
          ? `TinyFish Fetch 失敗：${error.message}`
          : "TinyFish Fetch 失敗。",
    };
  }
}

async function fetchPdfText(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; HKFamilyFunBot/2.0; +https://www.hkfamilyfun.com)",
        accept: "application/pdf,*/*;q=0.5",
        "accept-language": "zh-HK,zh;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return {
        ok: false as const,
        error: `PDF 回應 ${response.status}，未能讀取檔案。`,
      };
    }

    const finalUrl = new URL(response.url || url);

    if (blockedHost(finalUrl.hostname)) {
      return {
        ok: false as const,
        error: "PDF 重新導向至不安全網址，已停止讀取。",
      };
    }

    const declaredLength = Number(
      response.headers.get("content-length") || "0"
    );

    if (declaredLength > MAX_PDF_BYTES) {
      return {
        ok: false as const,
        error: "PDF 超過 12MB，請改用活動網頁或手動輸入資料。",
      };
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_PDF_BYTES) {
      return {
        ok: false as const,
        error: "PDF 超過 12MB，請改用活動網頁或手動輸入資料。",
      };
    }

    const bytes = new Uint8Array(buffer);
    const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));

    if (!signature.startsWith("%PDF-")) {
      return {
        ok: false as const,
        error: "下載內容不是有效 PDF。",
      };
    }

    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });

    try {
      const result = await parser.getText();
      const text = normalizeDocumentText(result.text || "");

      if (!text) {
        return {
          ok: false as const,
          error:
            "PDF 沒有可抽取文字，可能是掃描圖片 PDF；請改用活動網頁或手動補資料。",
        };
      }

      return {
        ok: true as const,
        text,
        finalUrl: finalUrl.toString(),
      };
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? `免費 PDF 文字抽取失敗：${error.message}`
          : "免費 PDF 文字抽取失敗。",
    };
  }
}

function isPdfLike(url: URL) {
  return /\.pdf$/i.test(url.pathname);
}

function blockedHost(hostname: string) {
  const host = hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1"
  ) {
    return true;
  }

  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return true;
  }

  const private172 = host.match(/^172\.(\d{1,3})\./);

  if (private172) {
    const second = Number(private172[1]);
    if (second >= 16 && second <= 31) return true;
  }

  if (/^192\.168\./.test(host)) return true;

  if (
    /^fc/i.test(host) ||
    /^fd/i.test(host) ||
    /^fe8/i.test(host) ||
    /^fe9/i.test(host) ||
    /^fea/i.test(host) ||
    /^feb/i.test(host)
  ) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization") || "";

    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "請先登入已獲批准的商戶帳戶。",
        },
        { status: 401 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "活動匯入服務暫時未能連接資料庫。",
        },
        { status: 503 }
      );
    }

    const authClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "登入狀態已失效，請重新登入。",
        },
        { status: 401 }
      );
    }

    const { data: merchant, error: merchantError } =
      await authClient
        .from("merchants")
        .select("id,status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

    if (
      merchantError ||
      !merchant ||
      merchant.status !== "approved"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "商戶帳戶尚未獲批准，暫時不能使用智能網址匯入。",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const url = String(body?.url || "").trim();

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error: "請提供活動網址。",
        },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "活動網址格式不正確，請使用完整 https:// URL。",
        },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        {
          ok: false,
          error: "只支援 http 或 https 網址。",
        },
        { status: 400 }
      );
    }

    if (parsedUrl.username || parsedUrl.password) {
      return NextResponse.json(
        {
          ok: false,
          error: "活動網址不可包含登入帳號或密碼。",
        },
        { status: 400 }
      );
    }

    if (blockedHost(parsedUrl.hostname)) {
      return NextResponse.json(
        {
          ok: false,
          error: "基於安全原因，此網址不可匯入。",
        },
        { status: 400 }
      );
    }

    if (
      parsedUrl.port &&
      !["80", "443"].includes(parsedUrl.port)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "只支援一般 HTTP / HTTPS 網站連接埠。",
        },
        { status: 400 }
      );
    }

    let event = emptyEvent(parsedUrl.toString());
    let html = "";
    let documentText = "";
    let fetchError = "";
    let jinaUsed = false;
    let jinaAttempted = false;
    let tinyFishUsed = false;
    let tinyFishAttempted = false;
    let pdfUsed = false;
    let contentType = "";

    if (!isPdfLike(parsedUrl)) {
      try {
        const response = await fetch(parsedUrl.toString(), {
          method: "GET",
          headers: {
            "user-agent":
              "Mozilla/5.0 (compatible; HKFamilyFunBot/2.0; +https://www.hkfamilyfun.com)",
            accept:
              "text/html,application/xhtml+xml,application/xml,text/xml,text/plain,application/pdf;q=0.9,*/*;q=0.5",
            "accept-language":
              "zh-HK,zh;q=0.9,en;q=0.8",
          },
          cache: "no-store",
          redirect: "follow",
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
          fetchError = `網站回應 ${response.status}，將嘗試智能抽取。`;
        } else {
          const finalUrl = new URL(
            response.url || parsedUrl.toString()
          );

          if (blockedHost(finalUrl.hostname)) {
            fetchError =
              "重新導向至不安全網址，已停止直接讀取。";
          } else {
            contentType = (
              response.headers.get("content-type") || ""
            ).toLowerCase();

            const allowedTextContent =
              contentType.includes("text/html") ||
              contentType.includes(
                "application/xhtml+xml"
              ) ||
              contentType.includes("application/xml") ||
              contentType.includes("text/xml") ||
              contentType.includes("text/plain");

            if (contentType.includes("application/pdf")) {
              fetchError =
                "偵測到 PDF，改用 PDF 智能文字抽取。";
            } else if (!allowedTextContent) {
              fetchError =
                `此網址內容格式需要智能抽取（${contentType || "unknown"}）。`;
            } else {
              const declaredLength = Number(
                response.headers.get("content-length") ||
                  "0"
              );

              if (declaredLength > MAX_SOURCE_BYTES) {
                fetchError =
                  "活動網頁內容超過 2MB，改用智能抽取。";
              } else {
                const buffer =
                  await response.arrayBuffer();

                if (buffer.byteLength > MAX_SOURCE_BYTES) {
                  fetchError =
                    "活動網頁內容超過 2MB，改用智能抽取。";
                } else {
                  html = new TextDecoder(
                    "utf-8"
                  ).decode(buffer);
                }
              }
            }
          }
        }
      } catch (error) {
        fetchError =
          error instanceof Error
            ? `直接讀取失敗：${error.message}`
            : "直接讀取失敗，將嘗試智能抽取。";
      }
    } else {
      fetchError =
        "偵測到 PDF，改用 PDF 智能文字抽取。";
    }

    if (html) {
      const title = getTitle(html);
      const description = getDescription(html);
      const image = getImage(
        html,
        parsedUrl.toString()
      );

      documentText = htmlToDocumentText(html).slice(
        0,
        40000
      );

      const jsonLdItems = extractJsonLd(html);
      const jsonLdEvent =
        findEventJsonLd(jsonLdItems);

      event = {
        ...event,
        title_tc: title,
        short_description_tc:
          description.slice(0, 160),
        description_tc: description,
        cover_image_url: image,
        gallery_image_urls: image ? [image] : [],
      };

      event = applyJsonLd(
        event,
        jsonLdEvent,
        parsedUrl.toString()
      );

      event = applyTextExtraction(
        event,
        documentText,
        {
          sourceLabel:
            "已完成 server-side HTML / Meta / JSON-LD 結構化抽取。",
        }
      );
    }


    if (isPdfLike(parsedUrl)) {
      const pdfResult = await fetchPdfText(parsedUrl.toString());

      if (pdfResult.ok) {
        pdfUsed = true;
        fetchError = "";
        documentText = pdfResult.text.slice(0, 50000);

        event = applyTextExtraction(
          event,
          documentText,
          {
            sourceLabel:
              "已使用免費 server-side PDF 文字抽取，不需要 TinyFish / AI API key。",
          }
        );
      } else {
        fetchError = pdfResult.error;
      }
    }

    const shouldUseJina =
      Boolean(fetchError) ||
      !documentText ||
      !event.title_tc ||
      !event.start_date;

    if (shouldUseJina) {
      jinaAttempted = true;

      const jina = await fetchWithJinaReader(
        parsedUrl.toString()
      );

      if (jina.ok) {
        jinaUsed = true;
        fetchError = "";
        documentText = jina.text.slice(0, 50000);

        event = applyTextExtraction(
          event,
          documentText,
          {
            imageLinks: jina.imageLinks,
            sourceLabel:
              "已使用 Jina Reader 免費智能文件解析作後備，毋須 API key。",
          }
        );
      } else {
        fetchError = jina.error;
      }
    }

    const shouldUseTinyFish =
      Boolean(fetchError) ||
      !event.title_tc ||
      !event.start_date;

    if (shouldUseTinyFish) {
      tinyFishAttempted = true;

      const tinyFish =
        await fetchWithTinyFish(parsedUrl.toString());

      if (tinyFish.ok) {
        tinyFishUsed = true;
        fetchError = "";
        documentText = tinyFish.text.slice(0, 50000);

        event = applyTextExtraction(
          event,
          documentText,
          {
            title: tinyFish.title,
            description: tinyFish.description,
            imageLinks: tinyFish.imageLinks,
            sourceLabel:
              "已使用 TinyFish Fetch 免費智能抽取 PDF / 動態網頁文字。",
          }
        );
      } else {
        fetchError = tinyFish.error;
      }
    }

    if (
      fetchError &&
      !event.extraction_notes.includes(fetchError)
    ) {
      event.extraction_notes.push(fetchError);
    }

    if (!event.title_tc) {
      event.extraction_notes.push(
        "未能穩定抽取活動名稱，請商戶手動填寫。"
      );
    }

    if (!event.start_date) {
      event.extraction_notes.push(
        "未能穩定抽取活動日期，請商戶手動確認。"
      );
    }

    if (!event.start_time) {
      event.extraction_notes.push(
        "未能穩定抽取活動時間，請商戶手動確認。"
      );
    }

    if (!event.cover_image_url) {
      event.extraction_notes.push(
        tinyFishUsed && isPdfLike(parsedUrl)
          ? "PDF 文字已成功抽取；PDF 內嵌圖片目前不會自動成為封面，請於編輯頁上載活動圖片。"
          : "未能抽取活動圖片，請商戶手動貼圖片 URL 或稍後上載圖片。"
      );
    }

    if (
      isPdfLike(parsedUrl) &&
      !pdfUsed &&
      jinaAttempted &&
      !jinaUsed
    ) {
      event.extraction_notes.push(
        "PDF 直接解析及免費 Jina Reader 後備均未完成；請改用官方活動網頁或手動補資料。"
      );
    }

    if (
      tinyFishAttempted &&
      !tinyFishUsed &&
      !process.env.TINYFISH_API_KEY?.trim()
    ) {
      event.extraction_notes.push(
        "TinyFish 只作第三層可選後備；未設定 API key 不會影響免費 HTML / PDF / Jina Reader 抽取。"
      );
    }

    event.extraction_notes.push(
      "匯入結果只會建立草稿，不會自動發布；日期、地點、價格及報名資料必須由商戶 / Admin 最後確認。"
    );

    event.extraction_notes = Array.from(
      new Set(
        event.extraction_notes
          .map((note) => note.trim())
          .filter(Boolean)
      )
    );

    return NextResponse.json({
      ok: true,
      event,
      extraction_engine: jinaUsed
        ? "jina_reader"
        : pdfUsed
          ? "pdf_parse"
          : tinyFishUsed
            ? "tinyfish_fetch"
            : html
              ? "direct_html"
              : "manual_required",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "匯入活動資料時發生未知錯誤。",
      },
      { status: 500 }
    );
  }
}
