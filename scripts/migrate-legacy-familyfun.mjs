"use strict";

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const OLD_URL =
  process.env.OLD_SUPABASE_URL ||
  "https://nyutyriuypjznbxtlbmo.supabase.co";
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || "";
const NEW_URL =
  process.env.SUPABASE_URL ||
  "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APPLY =
  String(process.env.APPLY_MIGRATION || "false").toLowerCase() === "true";
const CONFIRMED =
  String(process.env.MIGRATION_CONFIRM || "") === "SAFE_DELTA_ONLY";
const BATCH_SIZE = 200;

if (!OLD_KEY) throw new Error("OLD_SUPABASE_SERVICE_ROLE_KEY is required");
if (!NEW_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
if (APPLY && !CONFIRMED) {
  throw new Error(
    "Refusing legacy write: set MIGRATION_CONFIRM=SAFE_DELTA_ONLY together with APPLY_MIGRATION=true",
  );
}

const oldDb = createClient(OLD_URL, OLD_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const newDb = createClient(NEW_URL, NEW_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function text(value) {
  return value == null ? "" : String(value).trim();
}

function arr(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      }
    } catch {}

    return value
      .split(/[,，、\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hkParts(timestamp) {
  if (!timestamp) return { date: null, time: null };

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { date: null, time: null };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function norm(value) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function nowHkDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function safeLegacyStatus(row) {
  const start = hkParts(row.start_time).date;
  const end = hkParts(row.end_time).date || start;
  const expired = Boolean(end && end < nowHkDate());

  // Final delta imports are intentionally non-public. Old approval is retained
  // only as metadata for Admin review; it never becomes V2 approval/publication.
  return expired ? "archived" : "draft";
}

function gallery(row) {
  const urls = arr(row.images).filter((url) => /^https?:\/\//i.test(url));
  const cover = text(row.image_url || row.cover_image);
  return [...new Set([cover, ...urls].filter(Boolean))].slice(0, 6);
}

function sourceFingerprint(row) {
  return "legacy:" + text(row.id);
}

function sourceSnapshotHash(row, mapped) {
  const snapshot = {
    id: text(row.id),
    legacy_status: text(row.status).toLowerCase(),
    legacy_updated_at: text(row.updated_at),
    title_tc: mapped.title_tc,
    start_date: mapped.start_date,
    end_date: mapped.end_date,
    start_time: mapped.start_time,
    end_time: mapped.end_time,
    venue_name: mapped.venue_name,
    address: mapped.address,
    district: mapped.district,
    registration_url: mapped.registration_url,
    official_url: mapped.official_url,
    cover_image_url: mapped.cover_image_url,
  };

  return sha256(JSON.stringify(snapshot));
}

function mapRow(row, merchant) {
  const start = hkParts(row.start_time);
  const end = hkParts(row.end_time);
  const registration = text(
    row.external_registration_url ||
      row.registration_link ||
      row.external_link,
  );
  const official = text(
    row.external_link ||
      row.registration_link ||
      row.external_registration_url,
  );
  const images = gallery(row);
  const status = safeLegacyStatus(row);
  const merchantName = text(merchant?.business_name || merchant?.name);
  const legacyStatus = text(row.status).toLowerCase();

  const mapped = {
    title_tc: text(row.title),
    title: text(row.title_en || row.title),
    short_description_tc:
      text(row.meta_description || row.description).slice(0, 220) || null,
    description_tc: text(row.description) || null,
    organizer_name: merchantName || null,
    cover_image_url: images[0] || null,
    gallery_image_urls: images,
    start_date: start.date,
    end_date: end.date || start.date,
    start_time: start.time,
    end_time: end.time,
    venue_name: text(row.location) || null,
    address: text(row.address) || null,
    district: text(row.district_id) || null,
    area: text(row.area_id) || null,
    google_map_url: text(row.google_map_url) || null,
    latitude: finiteNumber(row.latitude),
    longitude: finiteNumber(row.longitude),
    age_min: row.age_min ?? null,
    age_max: row.age_max ?? null,
    category: text(row.category) || null,
    tags: arr(row.tags),
    is_free: Boolean(row.is_free),
    is_sen_friendly: Boolean(row.is_sen_friendly),
    is_featured: Boolean(row.is_featured),
    registration_required: Boolean(row.requires_booking),
    registration_url: registration || null,
    official_url: official || null,
    source_url: official || null,
    cta_type: registration ? "official" : "none",
    cta_label: registration ? "查看官方活動頁" : null,
    show_on_calendar: row.show_on_calendar !== false,
    transportation_notes: text(row.transport_info) || null,
    highlights: text(row.highlights) || null,
    remarks: text(row.other_info) || null,
    status,
    published_at: null,
    approved_at: null,
    submitted_at: null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_type: official ? "url" : "manual",
    source_fingerprint: sourceFingerprint(row),
    auto_import_note:
      "Safe legacy delta import from Supabase activity " +
      text(row.id) +
      "; Admin review required before publication.",
    admin_review_note:
      "Imported by safe legacy delta sync. Original legacy status: " +
      (legacyStatus || "unknown") +
      ". Review before approval/publication.",
    merchant_id: null,
    platform_takes_booking: false,
    platform_takes_payment: false,
  };

  mapped.ai_extracted_json = {
    legacy_migration: true,
    legacy_activity_id: text(row.id),
    legacy_status: legacyStatus || null,
    legacy_created_at: text(row.created_at) || null,
    legacy_updated_at: text(row.updated_at) || null,
    legacy_date_class: status === "archived" ? "expired" : "current_future",
    safe_delta_import: true,
    source_snapshot_hash: sourceSnapshotHash(row, mapped),
    imported_at: new Date().toISOString(),
  };

  return mapped;
}

async function allRows(client, table, columns = "*") {
  const output = [];

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);

    output.push(...(data || []));
    if (!data || data.length < BATCH_SIZE) break;
  }

  return output;
}

function coreComparison(row) {
  return {
    title_tc: text(row.title_tc),
    start_date: text(row.start_date),
    end_date: text(row.end_date),
    venue_name: text(row.venue_name),
    source_url: text(row.source_url),
    official_url: text(row.official_url),
    registration_url: text(row.registration_url),
    cover_image_url: text(row.cover_image_url),
  };
}

function hasCoreDrift(existing, mapped) {
  const current = coreComparison(existing);
  const incoming = coreComparison(mapped);
  return Object.keys(incoming).some((key) => current[key] !== incoming[key]);
}

async function createIssue(report) {
  const token = process.env.GITHUB_TOKEN || "";
  const repository = process.env.GITHUB_REPOSITORY || "";
  if (!token || !repository) return;

  const body = [
    "## HK Family Fun safe legacy delta report",
    "",
    `- Old activities scanned: **${report.oldTotal}**`,
    `- V2 events scanned: **${report.newTotal}**`,
    `- Existing exact legacy IDs: **${report.existingLegacyIds}**`,
    `- Existing legacy rows with source/V2 drift: **${report.existingDrift}**`,
    `- URL duplicates outside exact legacy IDs: **${report.sourceDuplicates}**`,
    `- Semantic duplicates outside exact legacy IDs: **${report.semanticDuplicates}**`,
    `- Invalid / unsafe source rows skipped: **${report.invalidRows}**`,
    `- Planned safe inserts: **${report.plannedInserts}**`,
    `- Planned current/future drafts: **${report.plannedDrafts}**`,
    `- Planned expired archives: **${report.plannedArchived}**`,
    "",
    APPLY
      ? "### Migration mode: SAFE APPLY (insert-only)"
      : "### Migration mode: DRY RUN ONLY",
    "",
    "Safety rules:",
    "- no legacy row is auto-published",
    "- no legacy row is auto-approved",
    "- existing V2 legacy rows are never overwritten",
    "- legacy merchant login accounts are never migrated",
    "- exact legacy IDs use the existing `legacy:<old-id>` fingerprint format",
  ].join("\n");

  await fetch(`https://api.github.com/repos/${repository}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: APPLY
        ? "HKFF safe legacy delta applied"
        : "HKFF safe legacy delta dry-run",
      body,
      assignees: ["familyfunhongkong-game"],
    }),
  });
}

async function main() {
  const [activities, merchants, newEvents] = await Promise.all([
    allRows(oldDb, "activities"),
    allRows(
      oldDb,
      "merchants",
      "id,name,business_name,email,contact_email,website_url,status",
    ),
    allRows(
      newDb,
      "events",
      "id,title_tc,start_date,end_date,venue_name,source_url,official_url,registration_url,cover_image_url,source_fingerprint,status,ai_extracted_json,updated_at",
    ),
  ]);

  const merchantsById = new Map(merchants.map((merchant) => [merchant.id, merchant]));
  const existingByFingerprint = new Map(
    newEvents
      .filter((event) => text(event.source_fingerprint))
      .map((event) => [text(event.source_fingerprint), event]),
  );
  const existingUrls = new Set();
  const semantic = new Set();

  for (const event of newEvents) {
    for (const url of [
      event.source_url,
      event.official_url,
      event.registration_url,
    ]) {
      if (text(url)) existingUrls.add(text(url));
    }

    semantic.add(
      [norm(event.title_tc), text(event.start_date), norm(event.venue_name)].join(
        "|",
      ),
    );
  }

  let existingLegacyIds = 0;
  let existingDrift = 0;
  let sourceDuplicates = 0;
  let semanticDuplicates = 0;
  let invalidRows = 0;
  let plannedDrafts = 0;
  let plannedArchived = 0;
  const inserts = [];
  const driftDetails = [];

  for (const row of activities) {
    const mapped = mapRow(row, merchantsById.get(row.merchant_id));
    const fingerprint = mapped.source_fingerprint;
    const existing = existingByFingerprint.get(fingerprint);

    if (existing) {
      existingLegacyIds += 1;

      if (hasCoreDrift(existing, mapped)) {
        existingDrift += 1;
        driftDetails.push({
          legacy_activity_id: text(row.id),
          existing_event_id: existing.id,
          title: mapped.title_tc,
        });
      }

      continue;
    }

    if (!mapped.title_tc) {
      invalidRows += 1;
      continue;
    }

    if (
      mapped.start_date &&
      mapped.end_date &&
      mapped.end_date < mapped.start_date
    ) {
      invalidRows += 1;
      continue;
    }

    const urls = [
      mapped.source_url,
      mapped.official_url,
      mapped.registration_url,
    ].filter(Boolean);

    if (urls.some((url) => existingUrls.has(url))) {
      sourceDuplicates += 1;
      continue;
    }

    const semanticKey = [
      norm(mapped.title_tc),
      text(mapped.start_date),
      norm(mapped.venue_name),
    ].join("|");

    if (semantic.has(semanticKey)) {
      semanticDuplicates += 1;
      continue;
    }

    inserts.push(mapped);
    existingByFingerprint.set(fingerprint, mapped);
    semantic.add(semanticKey);
    urls.forEach((url) => existingUrls.add(url));

    if (mapped.status === "archived") plannedArchived += 1;
    else plannedDrafts += 1;
  }

  if (APPLY && inserts.length) {
    for (let index = 0; index < inserts.length; index += 50) {
      const chunk = inserts.slice(index, index + 50);
      const { error } = await newDb.from("events").insert(chunk);

      if (error) {
        throw new Error("Safe delta insert batch failed: " + error.message);
      }
    }
  }

  const report = {
    oldTotal: activities.length,
    newTotal: newEvents.length,
    existingLegacyIds,
    existingDrift,
    sourceDuplicates,
    semanticDuplicates,
    invalidRows,
    plannedInserts: inserts.length,
    plannedDrafts,
    plannedArchived,
    apply: APPLY,
    driftDetails: driftDetails.slice(0, 50),
  };

  console.log(JSON.stringify(report, null, 2));
  await createIssue(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
