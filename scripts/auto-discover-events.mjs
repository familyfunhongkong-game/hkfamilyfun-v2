"use strict";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const APPROVAL_EMAIL =
  process.env.APPROVAL_EMAIL || "info@hkfamilyfun.com";
const SITE_URL =
  process.env.SITE_URL || "https://hkfamilyfun-v2.vercel.app";
const MAX_NEW_EVENTS = Number(process.env.MAX_NEW_EVENTS || "5");

if (!SERVICE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function cleanText(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(String(value || "").trim(), baseUrl).toString();
  } catch {
    return "";
  }
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
      (key) => url.searchParams.delete(key),
    );
    return url.toString();
  } catch {
    return value;
  }
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(normalizeUrl(value))
    .digest("hex");
}

function getMeta(html, names) {
  for (const name of names) {
    const p1 = new RegExp(
      '<meta[^>]+(?:property|name)=["\\\']' +
        name +
        '["\\\'][^>]+content=["\\\']([^"\\\']*)["\\\'][^>]*>',
      "i",
    );
    const p2 = new RegExp(
      '<meta[^>]+content=["\\\']([^"\\\']*)["\\\'][^>]+(?:property|name)=["\\\']' +
        name +
        '["\\\'][^>]*>',
      "i",
    );
    const match = html.match(p1) || html.match(p2);
    if (match?.[1]) return cleanText(match[1]);
  }

  return "";
}

function getTitle(html) {
  return (
    getMeta(html, ["og:title", "twitter:title"]) ||
    cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
  );
}

function getDescription(html) {
  return getMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
}

function getImage(html, baseUrl) {
  const value = getMeta(html, [
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);
  return value ? absoluteUrl(value, baseUrl) : "";
}

function extractJsonLd(html) {
  const matches = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  );

  const values = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) values.push(...parsed);
      else if (Array.isArray(parsed?.["@graph"])) {
        values.push(...parsed["@graph"]);
      } else values.push(parsed);
    } catch {
      // Ignore invalid JSON-LD.
    }
  }

  return values;
}

function findEventJsonLd(items) {
  return items.find((item) => {
    const type = item?.["@type"];
    if (Array.isArray(type)) {
      return type.some((entry) =>
        String(entry).toLowerCase().includes("event"),
      );
    }
    return String(type || "").toLowerCase().includes("event");
  });
}

function dateOnly(value) {
  const text = String(value || "").trim();
  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];

  const match = text.match(
    /(\d{4})[/.年-](\d{1,2})[/.月-](\d{1,2})/,
  );
  if (!match) return "";

  return (
    match[1] +
    "-" +
    match[2].padStart(2, "0") +
    "-" +
    match[3].padStart(2, "0")
  );
}

function timeOnly(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return match[1].padStart(2, "0") + ":" + match[2];
}

function hkToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function looksFamilyRelevant(text) {
  const haystack = text.toLowerCase();
  const keywords = [
    "親子",
    "兒童",
    "小朋友",
    "家庭",
    "kids",
    "family",
    "children",
    "workshop",
    "工作坊",
    "故事",
    "festival",
    "嘉年華",
    "展覽",
    "museum",
    "博物館",
    "science",
    "steam",
    "藝術",
  ];

  return keywords.some((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  );
}

function extractLinks(html, source) {
  const found = new Set();

  for (const match of html.matchAll(
    /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>/gi,
  )) {
    const url = absoluteUrl(match[1], source.url);
    if (!url) continue;

    try {
      const parsed = new URL(url);
      if (parsed.hostname !== source.host) continue;
      if (
        !source.pathIncludes.some((piece) =>
          parsed.pathname.includes(piece),
        )
      ) {
        continue;
      }
      found.add(normalizeUrl(url));
    } catch {
      // Ignore invalid links.
    }
  }

  return [...found];
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "HKFamilyFunDiscoveryBot/1.0 (+https://hkfamilyfun.com)",
      "accept-language": "zh-HK,zh;q=0.9,en;q=0.8",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      String(response.status) + " " + response.statusText,
    );
  }

  const type = (
    response.headers.get("content-type") || ""
  ).toLowerCase();

  if (
    !type.includes("text/html") &&
    !type.includes("application/xhtml+xml")
  ) {
    throw new Error(
      "Unsupported content-type: " + (type || "unknown"),
    );
  }

  const text = await response.text();
  return text.slice(0, 3000000);
}

async function extractEvent(url, sourceName) {
  const html = await fetchHtml(url);
  const jsonLd = findEventJsonLd(extractJsonLd(html));
  const title = cleanText(jsonLd?.name || getTitle(html));
  const description = cleanText(
    jsonLd?.description || getDescription(html),
  );
  const pageText = cleanText(html).slice(0, 25000);

  if (
    !looksFamilyRelevant(
      title + " " + description + " " + pageText.slice(0, 5000),
    )
  ) {
    return null;
  }

  const startDate = dateOnly(
    jsonLd?.startDate || pageText,
  );
  const endDate =
    dateOnly(
      jsonLd?.endDate || jsonLd?.startDate || pageText,
    ) || startDate;

  if (!startDate) return null;
  if (endDate && endDate < hkToday()) return null;

  const location = jsonLd?.location || {};
  const address =
    typeof location.address === "string"
      ? location.address
      : [
          location.address?.streetAddress,
          location.address?.addressLocality,
          location.address?.addressRegion,
        ]
          .filter(Boolean)
          .join(" ");

  const offers = Array.isArray(jsonLd?.offers)
    ? jsonLd.offers[0]
    : jsonLd?.offers || {};

  const imageValue = Array.isArray(jsonLd?.image)
    ? jsonLd.image[0]
    : jsonLd?.image;

  const image =
    absoluteUrl(String(imageValue || ""), url) ||
    getImage(html, url);

  const offerPrice = Number(offers?.price);
  const isFree =
    /免費|free/i.test(
      String(offers?.price || "") + " " + pageText.slice(0, 8000),
    ) || offerPrice === 0;

  return {
    title_tc: title || "自動發現活動",
    title: title || "Auto-discovered event",
    short_description_tc: description.slice(0, 180),
    description_tc: description,
    start_date: startDate,
    end_date: endDate || startDate,
    start_time: timeOnly(jsonLd?.startDate),
    end_time: timeOnly(jsonLd?.endDate),
    venue_name: cleanText(location.name || ""),
    address: cleanText(address),
    organizer_name: cleanText(
      jsonLd?.organizer?.name || sourceName,
    ),
    cover_image_url: image,
    gallery_image_urls: image ? [image] : [],
    price_display_mode: isFree
      ? "free"
      : offerPrice > 0
        ? "fixed"
        : "unknown",
    price_label: isFree
      ? "免費"
      : offerPrice > 0
        ? "HK$" + offerPrice
        : "收費待確認",
    min_price: offerPrice > 0 ? offerPrice : null,
    is_free: isFree,
    registration_url: absoluteUrl(
      String(offers?.url || jsonLd?.url || url),
      url,
    ),
    official_url: url,
    source_url: url,
    cta_type: "official",
    cta_label: "查看官方活動頁",
    source_type: "auto_discovery",
    status: "draft",
    auto_imported_at: new Date().toISOString(),
    auto_import_note:
      "Automatically discovered from official source: " +
      sourceName +
      ". Requires Admin review before publishing.",
    source_fingerprint: fingerprint(url),
    updated_at: new Date().toISOString(),
  };
}

async function sendApprovalEmail(events) {
  if (!events.length || !RESEND_API_KEY) return false;

  const rows = events
    .map(
      (event) =>
        "<li style=\"margin-bottom:16px\"><strong>" +
        event.title_tc +
        "</strong><br/>" +
        (event.start_date || "日期待確認") +
        " · " +
        (event.venue_name || "場地待確認") +
        "<br/><a href=\"" +
        SITE_URL +
        "/admin/events/" +
        event.id +
        "\">開啟 Admin 審批</a> | <a href=\"" +
        event.source_url +
        "\">官方來源</a></li>",
    )
    .join("");

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HK Family Fun <onboarding@resend.dev>",
        to: [APPROVAL_EMAIL],
        subject:
          "HK Family Fun：" +
          events.length +
          " 個新活動等待審批",
        html:
          "<h2>HK Family Fun 自動發現新活動</h2>" +
          "<p>以下活動已建立為 Draft，不會自動公開。請核對日期、時間、圖片、地點及報名資料後再發布。</p>" +
          "<ol>" +
          rows +
          "</ol><p><a href=\"" +
          SITE_URL +
          "/admin/events\">前往 Admin 活動審批中心</a></p>",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      "Resend email failed: " +
        response.status +
        " " +
        (await response.text()),
    );
  }

  return true;
}

async function createApprovalIssue(events) {
  if (!events.length) return false;

  const token = process.env.GITHUB_TOKEN || "";
  const repository = process.env.GITHUB_REPOSITORY || "";

  if (!token || !repository) return false;

  const body = [
    "## HK Family Fun 自動發現新活動",
    "",
    "以下活動已建立為 **Draft**，不會自動公開。請核對日期、時間、圖片、地點及報名資料後再發布。",
    "",
    ...events.map((event, index) =>
      [
        `${index + 1}. **${event.title_tc}**`,
        `   - 日期：${event.start_date || "待確認"}`,
        `   - 場地：${event.venue_name || "待確認"}`,
        `   - [Admin 審批](${SITE_URL}/admin/events/${event.id})`,
        `   - [官方來源](${event.source_url})`,
      ].join("\n"),
    ),
    "",
    `[前往 Admin 活動審批中心](${SITE_URL}/admin/events)`,
  ].join("\n");

  const response = await fetch(
    `https://api.github.com/repos/${repository}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: `HK Family Fun：${events.length} 個新活動等待審批`,
        body,
      }),
    },
  );

  if (!response.ok) {
    console.warn(
      "GitHub approval issue failed:",
      response.status,
      await response.text(),
    );
    return false;
  }

  return true;
}

async function main() {
  const sources = JSON.parse(
    await fs.readFile(
      new URL(
        "../config/event-sources.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  const discovered = [];

  for (const source of sources) {
    try {
      const html = await fetchHtml(source.url);
      for (const url of extractLinks(html, source)) {
        discovered.push({
          url,
          sourceName: source.name,
        });
      }
    } catch (error) {
      console.warn(
        "Source failed:",
        source.name,
        error?.message || error,
      );
    }
  }

  const unique = [];
  const seen = new Set();

  for (const item of discovered) {
    const key = normalizeUrl(item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  const inserted = [];

  for (const item of unique) {
    if (inserted.length >= MAX_NEW_EVENTS) break;

    const fp = fingerprint(item.url);

    const { data: existing, error: duplicateError } =
      await supabase
        .from("events")
        .select("id")
        .eq("source_fingerprint", fp)
        .maybeSingle();

    if (duplicateError) {
      console.warn(
        "Duplicate check failed:",
        item.url,
        duplicateError.message,
      );
      continue;
    }

    if (existing) continue;

    try {
      const event = await extractEvent(
        item.url,
        item.sourceName,
      );

      if (!event) continue;

      const { data, error } = await supabase
        .from("events")
        .insert(event)
        .select(
          "id,title_tc,start_date,venue_name,source_url",
        )
        .single();

      if (error) {
        console.warn(
          "Insert failed:",
          item.url,
          error.message,
        );
        continue;
      }

      inserted.push(data);
    } catch (error) {
      console.warn(
        "Event extraction failed:",
        item.url,
        error?.message || error,
      );
    }
  }

  let emailSent = false;

  try {
    emailSent = await sendApprovalEmail(inserted);
  } catch (error) {
    console.warn("Approval email failed:", error?.message || error);
  }

  const issueCreated = await createApprovalIssue(inserted);

  console.log(
    JSON.stringify(
      {
        sources: sources.length,
        candidateLinks: unique.length,
        inserted: inserted.length,
        insertedEvents: inserted,
        emailSent,
        issueCreated,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
