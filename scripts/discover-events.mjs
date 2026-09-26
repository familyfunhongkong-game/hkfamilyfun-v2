import fs from "node:fs/promises";
import crypto from "node:crypto";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APPROVAL_EMAIL = process.env.APPROVAL_EMAIL || "info@hkfamilyfun.com";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://hkfamilyfun-v2.vercel.app";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const sourceText = await fs.readFile(
  new URL("../data/event-sources.json", import.meta.url),
  "utf8",
);
const sources = JSON.parse(sourceText);

const EVENT_WORDS = [
  "親子","兒童","家庭","小朋友","工作坊","展覽","節","嘉年華",
  "活動","故事","體驗","中秋","聖誕","萬聖節","市集","表演"
];
const IGNORE_WORDS = ["私隱","條款","主頁","登入","搜尋","聯絡","關於","下載"];
const MAX_NEW_DRAFTS_PER_RUN = 5;

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function absoluteUrl(base, href) {
  try { return new URL(href, base).toString(); } catch { return ""; }
}

function fingerprint(url) {
  return crypto.createHash("sha256").update(url).digest("hex");
}

function looksLikeEvent(title, url) {
  const text = normalizeText(String(title) + " " + String(url)).toLowerCase();
  if (!title || !url) return false;
  if (IGNORE_WORDS.some((word) => text.includes(word.toLowerCase()))) return false;
  return EVENT_WORDS.some((word) => text.includes(word.toLowerCase()));
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error("Supabase request failed " + response.status + ": " + body);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

async function sourceAlreadyExists(url, fp) {
  const byFingerprint = await supabaseRequest(
    "events?select=id&source_fingerprint=eq." + encodeURIComponent(fp) + "&limit=1",
  );
  if (byFingerprint.length) return true;

  const byUrl = await supabaseRequest(
    "events?select=id&source_url=eq." + encodeURIComponent(url) + "&limit=1",
  );
  return byUrl.length > 0;
}


function firstText(value) {
  if (Array.isArray(value)) return firstText(value[0]);
  if (value && typeof value === "object" && "name" in value) return firstText(value.name);
  return normalizeText(value || "");
}

function isoCalendarParts(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  return {
    date: match?.[1] || null,
    time: match?.[2] || null,
  };
}

function readJsonLdEvents($) {
  const events = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== "object") continue;

        if (Array.isArray(item["@graph"])) queue.push(...item["@graph"]);

        const type = item["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((entry) => String(entry).toLowerCase() === "event")) {
          events.push(item);
        }
      }
    } catch {
      // Invalid publisher JSON-LD should not stop the whole discovery run.
    }
  });

  return events;
}

async function enrichCandidate(candidate) {
  try {
    const response = await fetch(candidate.url, {
      headers: {
        "User-Agent":
          "HKFamilyFunEventDiscovery/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return candidate;

    const html = await response.text();
    const $ = cheerio.load(html);
    const structured = readJsonLdEvents($)[0] || {};

    const ogTitle = normalizeText(
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").first().text()
    );

    const description = normalizeText(
      firstText(structured.description) ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      ""
    );

    const imageValue = structured.image;
    const image =
      firstText(imageValue) ||
      normalizeText($('meta[property="og:image"]').attr("content") || "");

    const start = isoCalendarParts(structured.startDate);
    const end = isoCalendarParts(structured.endDate);

    const location = structured.location || {};
    const postalAddress =
      location && typeof location === "object" ? location.address || {} : {};

    const venueName =
      firstText(location) ||
      firstText(location?.name) ||
      "";

    const addressParts = [
      firstText(postalAddress?.streetAddress),
      firstText(postalAddress?.addressLocality),
      firstText(postalAddress?.addressRegion),
    ].filter(Boolean);

    const organizer =
      firstText(structured.organizer) ||
      candidate.sourceName;

    return {
      ...candidate,
      title: firstText(structured.name) || ogTitle || candidate.title,
      description: description.slice(0, 5000),
      shortDescription: description.slice(0, 260),
      image,
      startDate: start.date,
      endDate: end.date || start.date,
      startTime: start.time,
      endTime: end.time,
      venueName,
      address: addressParts.join(" "),
      organizer,
    };
  } catch {
    return candidate;
  }
}

async function insertDraft(candidate) {
  const enriched = await enrichCandidate(candidate);

  const payload = {
    title_tc: enriched.title,
    title: enriched.title,
    short_description_tc: enriched.shortDescription || null,
    description_tc: enriched.description || null,
    organizer_name: enriched.organizer || enriched.sourceName,
    start_date: enriched.startDate || null,
    end_date: enriched.endDate || enriched.startDate || null,
    start_time: enriched.startTime || null,
    end_time: enriched.endTime || null,
    venue_name: enriched.venueName || null,
    address: enriched.address || null,
    cover_image_url: enriched.image || null,
    source_url: enriched.url,
    official_url: enriched.url,
    source_type: "auto_discovered",
    source_fingerprint: enriched.fingerprint,
    auto_imported_at: new Date().toISOString(),
    auto_import_note:
      "Automatically discovered from an official source. Admin must verify date, time, venue, price, image and registration details before publishing.",
    status: "draft",
    hidden_pending_confirmation: true,
  };

  const rows = await supabaseRequest("events", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    row: rows[0] || null,
    enriched,
  };
}

async function discoverFromSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent":
        "HKFamilyFunEventDiscovery/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    console.warn("Skip " + source.name + ": HTTP " + response.status);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const found = new Map();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") || "";
    const title = normalizeText($(element).text());
    const url = absoluteUrl(source.url, href);

    if (!looksLikeEvent(title, url)) return;
    if (!url.startsWith("http")) return;
    if (url === source.url) return;

    const key = fingerprint(url);
    if (!found.has(key)) {
      found.set(key, {
        title: title.slice(0, 180),
        url,
        sourceName: source.name,
        fingerprint: key,
      });
    }
  });

  return [...found.values()].slice(0, 40);
}

async function sendApprovalEmail(inserted) {
  if (!RESEND_API_KEY || !inserted.length) return;

  const items = inserted
    .map((item) =>
      '<li style="margin-bottom:14px"><strong>' + item.title + '</strong><br>' +
      '來源：' + item.sourceName + '<br>' +
      '<a href="' + item.url + '">官方來源</a> · ' +
      '<a href="' + APP_BASE_URL + '/admin/events/' + item.id + '">Admin 審批</a></li>'
    )
    .join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HK Family Fun <onboarding@resend.dev>",
      to: [APPROVAL_EMAIL],
      subject: "HK Family Fun：" + inserted.length + " 個新活動待審批",
      html:
        "<h2>新活動自動發現</h2>" +
        "<p>以下活動只建立為 Draft，未經 Admin 批准不會公開。</p>" +
        "<ol>" + items + "</ol>" +
        "<p>請核對日期、時間、圖片、地點、收費及報名連結後才發布。</p>",
    }),
  });

  if (!response.ok) {
    console.warn("Resend email failed:", await response.text());
  }
}

const inserted = [];
const seenThisRun = new Set();

for (const source of sources) {
  try {
    const candidates = await discoverFromSource(source);

    for (const candidate of candidates) {
      if (seenThisRun.has(candidate.fingerprint)) continue;
      seenThisRun.add(candidate.fingerprint);

      if (await sourceAlreadyExists(candidate.url, candidate.fingerprint)) continue;

      const result = await insertDraft(candidate);
      const row = result.row;
      const enriched = result.enriched;

      if (row && row.id) {
        inserted.push({
          id: row.id,
          title: enriched.title,
          url: enriched.url,
          sourceName: enriched.sourceName,
        });
      }

      if (inserted.length >= MAX_NEW_DRAFTS_PER_RUN) break;
    }
    if (inserted.length >= MAX_NEW_DRAFTS_PER_RUN) break;
  } catch (error) {
    console.warn(
      "Discovery failed for " + source.name + ":",
      error instanceof Error ? error.message : error,
    );
  }
}

await sendApprovalEmail(inserted);

if (inserted.length) {
  const issueLines = [
    "# HK Family Fun 新活動待審批",
    "",
    "以下活動由每日官方來源掃描自動建立為 Draft；未經 Admin 批准不會公開。",
    "",
    ...inserted.flatMap((item, index) => [
      "## " + (index + 1) + ". " + item.title,
      "- 來源：" + item.sourceName,
      "- 官方來源：" + item.url,
      "- Admin 審批：" + APP_BASE_URL + "/admin/events/" + item.id,
      "",
    ]),
    "請核對日期、時間、圖片、地點、收費及報名連結後才發布。",
  ];

  await fs.writeFile(
    "event-discovery-summary.md",
    issueLines.join("\n"),
    "utf8",
  );
}

console.log(JSON.stringify({ discoveredDrafts: inserted.length, drafts: inserted }, null, 2));
