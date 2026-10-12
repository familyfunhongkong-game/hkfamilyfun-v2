import * as cheerio from "cheerio";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(value, baseUrl) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    return new URL(text, baseUrl).toString();
  } catch {
    return "";
  }
}

function normalizeClock(value) {
  const match = String(value || "").trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  const meridiem = match[3].toLowerCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return "";
  if (meridiem === "am" && hour === 12) hour = 0;
  if (meridiem === "pm" && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseCurrencyPrice(text) {
  const source = normalizeText(text);
  if (!source) return null;

  const labeled = source.match(
    /(?:價錢|價格|票價|費用|price|admission)\s*[:：]?\s*(?:HKD\s*)?(?:HK\$|\$)\s*([\d,]+(?:\.\d{1,2})?)/i,
  );

  const matches = Array.from(
    source.matchAll(/(?:HKD\s*)?(?:HK\$|\$)\s*([\d,]+(?:\.\d{1,2})?)/gi),
  );

  const values = Array.from(
    new Set(
      matches
        .map((match) => Number(String(match[1] || "").replace(/,/g, "")))
        .filter((value) => Number.isFinite(value)),
    ),
  ).sort((a, b) => a - b);

  if (labeled?.[1]) {
    const value = Number(labeled[1].replace(/,/g, ""));
    if (Number.isFinite(value) && !values.includes(value)) values.unshift(value);
  }

  if (!values.length) {
    const explicitFree =
      /(?:價錢|價格|票價|費用|price|admission)\s*[:：]?\s*(?:免費|free\b)|免費(?:入場|參加|登記)|費用全免|free admission|free entry/i.test(
        source,
      );

    if (explicitFree) {
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

  const hasEarlyBird = /早鳥|early bird|優惠/i.test(source);
  const hasOriginal = /原價|original/i.test(source);

  if (hasEarlyBird && values.length >= 2) {
    return {
      price_display_mode: "early_bird",
      price_label: `早鳥優惠價 HK$${values[0]}（原價 HK$${values[values.length - 1]}）`,
      min_price: String(values[0]),
      max_price: String(values[0]),
      offer_price: String(values[0]),
      original_price: String(values[values.length - 1]),
    };
  }

  if (values.length >= 2) {
    return {
      price_display_mode: "range",
      price_label: `HK$${values[0]}–HK$${values[values.length - 1]}`,
      min_price: String(values[0]),
      max_price: String(values[values.length - 1]),
      offer_price: "",
      original_price: hasOriginal ? String(values[values.length - 1]) : "",
    };
  }

  return {
    price_display_mode: "fixed",
    price_label: `HK$${values[0]}`,
    min_price: String(values[0]),
    max_price: String(values[0]),
    offer_price: "",
    original_price: "",
  };
}

function parseDateToken(value) {
  const match = String(value || "").match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

function extractEventDateRange(bodyText) {
  const labeled = bodyText.match(
    /(?:日期及時間|日期和時間|活動日期|活动日期|日期|date(?:s)?(?:\s*(?:&|and)\s*time)?)\s*[:：]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*[-–—至]\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i,
  );

  if (labeled) {
    return {
      startDate: parseDateToken(labeled[1]),
      endDate: parseDateToken(labeled[2]),
    };
  }

  const candidates = Array.from(
    bodyText.matchAll(
      /(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*[-–—至]\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/g,
    ),
  );

  for (const candidate of candidates) {
    const startDate = parseDateToken(candidate[1]);
    const endDate = parseDateToken(candidate[2]);
    if (!startDate || !endDate) continue;
    if (endDate >= startDate) return { startDate, endDate };
  }

  return { startDate: "", endDate: "" };
}

function extractSchedule(bodyText) {
  const rows = [];
  const pattern =
    /((?:周|星期)[一二三四五六日](?:至(?:周|星期)?[一二三四五六日])?)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–—至]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi;

  for (const match of bodyText.matchAll(pattern)) {
    const label = normalizeText(match[1]);
    const from = normalizeText(match[2]);
    const to = normalizeText(match[3]);
    const signature = `${label}|${from}|${to}`;
    if (rows.some((row) => row.signature === signature)) continue;
    rows.push({
      signature,
      label,
      from,
      to,
      startTime: normalizeClock(from),
      endTime: normalizeClock(to),
    });
  }

  return {
    rows,
    scheduleText: rows.map((row) => `${row.label} ${row.from} - ${row.to}`).join("；"),
    startTime: rows.length === 1 ? rows[0].startTime : "",
    endTime: rows.length === 1 ? rows[0].endTime : "",
  };
}

function extractLabeledVenue(bodyText) {
  const match = bodyText.match(
    /(?:地點|地点|venue|location)\s*[:：]?\s*(.{2,120}?)(?=\s*(?:價錢|价格|票價|費用|price|語言|语言|language|分享|share))/i,
  );
  return normalizeText(match?.[1] || "");
}

function scoreBookingLink(text, href, context) {
  let score = 0;
  if (/購票|買票|買飛|報名|登記|立即預訂|立即購買|buy\s*ticket|tickets?|book\s*now|register/i.test(text)) score += 12;
  if (/購票|報名|登記|ticket|booking|register/i.test(context)) score += 8;
  if (/bit\.ly|eventbrite|klook|kkday|ticketflap/i.test(href)) score += 4;
  if (/facebook|instagram|privacy|cookie|newsletter|login/i.test(text + " " + href)) score -= 10;
  return score;
}

function extractBookingUrl($, baseUrl) {
  let best = { score: 0, url: "" };

  $("a[href]").each((_, node) => {
    const anchor = $(node);
    const rawHref = anchor.attr("href") || "";
    const url = absoluteUrl(rawHref, baseUrl);
    if (!url || !/^https?:/i.test(url)) return;

    const text = normalizeText(anchor.text());
    const context = normalizeText(anchor.parent().text()).slice(0, 240);
    const score = scoreBookingLink(text, url, context);
    if (score > best.score) best = { score, url };
  });

  return best.score >= 4 ? best.url : "";
}

function extractHighlights($) {
  const blocked =
    /私隱|隐私|個人資料|个人资料|direct marketing|newsletter|subscription|cookie|聯絡我們|联系我们/i;
  const seen = new Set();
  const values = [];

  $("li").each((_, node) => {
    const value = normalizeText($(node).text());
    if (value.length < 18 || value.length > 260 || blocked.test(value)) return;
    if (seen.has(value)) return;
    seen.add(value);
    values.push(value);
  });

  return values.slice(0, 8);
}

export function extractStructuredPageDetails(html, baseUrl) {
  const $ = cheerio.load(String(html || ""));
  const bodyText = normalizeText($("body").text());
  const venueName = extractLabeledVenue(bodyText);
  const dates = extractEventDateRange(bodyText);
  const schedule = extractSchedule(bodyText);
  const bookingUrl = extractBookingUrl($, baseUrl);
  const highlights = extractHighlights($);
  const price = parseCurrencyPrice(bodyText);

  const sourceHost = (() => {
    try {
      return new URL(baseUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  let address = venueName;
  if (/airside\.com\.hk$/.test(sourceHost) && venueName && !/airside/i.test(venueName)) {
    address = `AIRSIDE ${venueName}`;
  }

  return {
    venueName,
    address,
    startDate: dates.startDate,
    endDate: dates.endDate,
    scheduleText: schedule.scheduleText,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    bookingUrl,
    highlights,
    price,
  };
}
