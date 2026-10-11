import { readFile } from "node:fs/promises";

const files = {
  merchant: await readFile("app/merchant/events/[id]/edit/page.tsx", "utf8"),
  adminDetail: await readFile("app/admin/events/[id]/page.tsx", "utf8"),
  adminList: await readFile("app/admin/events/page.tsx", "utf8"),
  readiness: await readFile("lib/events/readiness.ts", "utf8"),
  age: await readFile("lib/events/age-display.ts", "utf8"),
  publicEvents: await readFile("lib/supabase/events.ts", "utf8"),
  detail: await readFile("app/events/[id]/page.tsx", "utf8"),
  search: await readFile("components/events/PublicEventsSearchClient.tsx", "utf8"),
  favorites: await readFile("app/favorites/page.tsx", "utf8"),
  planner: await readFile("app/planner/page.tsx", "utf8"),
  publicCard: await readFile("components/events/PublicEventCard.tsx", "utf8"),
  publicType: await readFile("lib/types.ts", "utf8"),
  systemHealth: await readFile("app/api/admin/system-health/route.ts", "utf8"),
  systemHealthPage: await readFile("app/admin/system/page.tsx", "utf8"),
  visibility: await readFile("lib/events/visibility.ts", "utf8"),
  publicVisibilityMigration: await readFile(
    "supabase/migrations/20261011040256_preserve_open_ended_published_events.sql",
    "utf8",
  ),
  testMerchantCleanupMigration: await readFile(
    "supabase/migrations/20261011040824_remove_test_merchants_preserve_events.sql",
    "utf8",
  ),
  publicView: await readFile(
    "supabase/migrations/20260921114034_add_sanitized_public_events_view.sql",
    "utf8",
  ),
  midAutumnAgeCorrection: await readFile(
    "supabase/migrations/20261011030409_correct_mid_autumn_age_classification.sql",
    "utf8",
  ),
  agePlaceholderCorrection: await readFile(
    "supabase/migrations/20261011031740_remove_unverified_all_age_placeholders.sql",
    "utf8",
  ),
};

let failed = false;

function requireSignals(label, source, signals) {
  for (const signal of signals) {
    if (!source.includes(signal)) {
      console.error(`[event-data] ${label} missing: ${signal}`);
      failed = true;
    }
  }
}

requireSignals("merchant editor", files.merchant, [
  'age_groups: string[]',
  'is_sen_friendly: boolean',
  'is_indoor: boolean',
  'label="詳細地址（繁中）＊發布必填"',
  'evaluateEventReadiness',
  'submissionMissing(form',
  'saveEvent("submitted")',
  'Google Event rich result',
  'function toggleAgeGroup',
  'function updateAgeNumber',
  '"主辦方未註明"',
  'exclusiveValues = new Set(["所有年齡", "主辦方未註明"])',
  'getGalleryArray(event.age_group)',
]);

requireSignals("shared readiness", files.readiness, [
  'label: "完整地址"',
  'label: "適合年齡"',
  'label: "主辦方"',
  'level: "critical"',
  'googleEventReady',
  'recurrenceType !== "weekly"',
  'Number(input.ageMax) >= Number(input.ageMin)',
  'ageNumbersValid',
]);

requireSignals("truthful image policy", files.readiness, [
  'label: "官方活動圖片"',
  'level: "warning"',
  "HK Family Fun 品牌 placeholder",
]);

if (/key: "image"[\s\S]{0,160}level: "critical"/.test(files.readiness)) {
  console.error("[event-data] missing official event image must not be a hard publish blocker");
  failed = true;
}

if (/googleEventReady:[\s\S]{0,260}imageReady/.test(files.readiness)) {
  console.error("[event-data] Google Event readiness must not require recommended image property");
  failed = true;
}

requireSignals("admin detail", files.adminDetail, [
  'evaluateEventReadiness',
  'normalizeAgeGroups(event.age_groups).length > 0',
  'event.is_sen_friendly',
  'event.is_indoor',
  'disabled={saving || blocked}',
]);

requireSignals("admin list", files.adminList, [
  'const eventReadiness = getEventReadiness(event)',
  'eventReadiness.criticalMissing.join("、")',
  'Google Event Ready',
  'recurrenceType: event.recurrence_type',
  'recurrenceWeekdays: event.recurrence_weekdays',
  'disabled={isSaving || !ready}',
  'normalizeAgeGroups(event.age_groups).length > 0',
]);

requireSignals("age display", files.age, [
  '"所有年齡"',
  '"All ages"',
  '"主辦方未註明"',
  '"Age restriction not stated by organizer"',
  'return "Age TBC"',
  'return locale === "zh-Hans" ? "年龄待定" : "年齡待定"',
  'legacyAgeGroup',
]);

requireSignals("shared public accessibility", files.publicCard, [
  "event.senFriendly",
  "event.indoor",
  '"Indoor"',
]);

requireSignals("public Event type", files.publicType, [
  "senFriendly: boolean",
  "indoor?: boolean",
]);

requireSignals("launch content integrity API", files.systemHealth, [
  "publishedContentIntegrity",
  "currentFutureCoreIncomplete",
  "currentFutureCoreIncompleteItems",
  "evaluateEventReadiness",
  "Published Event Data Integrity",
  "ageGroups: event.age_groups",
]);

requireSignals("open-ended event visibility", files.visibility, [
  "isExplicitlyExpiredEvent",
  "isCurrentOrOpenEndedEvent",
  "isOpenEndedPastStart",
  "Asia/Hong_Kong",
]);

requireSignals("open-ended public data", files.publicEvents, [
  "isInternalTestEvent",
  "function parseCalendarDate",
  "parseCalendarDate(event.end_date)",
  "isExpiredEvent(event)",
  "isExplicitlyExpiredEvent(event.end_date, todayText)",
]);

requireSignals("open-ended launch health", files.systemHealth, [
  "isCurrentOrOpenEndedEvent(event.end_date, today)",
  "isOpenEndedPastStart(event.start_date, event.end_date, today)",
  "openEndedPastStart",
  "openEndedPastStartItems",
]);

requireSignals("open-ended visibility migration", files.publicVisibilityMigration, [
  'alter policy "Public can view published events"',
  'alter policy "Public can view published event images"',
  "end_date is null",
  "security_invoker = true",
  "hidden_pending_confirmation",
]);

requireSignals("test merchant cleanup migration", files.testMerchantCleanupMigration, [
  "Test Family Fun Centre",
  "business_name='Test'",
  "status='pending'",
  "status='archived'",
]);

if (files.systemHealth.includes(",whatsapp,age_group,age_groups,")) {
  console.error(
    "[event-data] launch health must not depend on legacy age_group database column",
  );
  failed = true;
}

requireSignals("launch content integrity UI", files.systemHealthPage, [
  "Core incomplete",
  "Google Event Ready",
  "Current/Future 已發布活動仍缺核心資料",
  "currentFutureCoreIncompleteItems",
]);

requireSignals("open-ended launch health UI", files.systemHealthPage, [
  "Open-ended review",
  "已開始但未提供結束日",
  "openEndedPastStartItems",
  "end_date 已過先會視作過期",
]);

requireSignals("launch image quality UI", files.systemHealthPage, [
  "缺官方圖（warning）",
  "HK Family Fun branded placeholder",
]);

if (files.systemHealthPage.includes("Core completeness 會檢查活動名稱、日期、地址、圖片")) {
  console.error("[event-data] System Health must not describe image as core-required data");
  failed = true;
}

if (files.publicEvents.includes("parseCalendarDate(event.end_date || event.start_date)")) {
  console.error(
    "[event-data] public event expiry must not treat start_date as an implicit end_date",
  );
  failed = true;
}

if (
  /currentFutureRows\s*=\s*publishedRows\.filter[\s\S]{0,220}end_date\s*\|\|\s*event\.start_date/.test(
    files.systemHealth,
  )
) {
  console.error(
    "[event-data] Published Current/Future health must use explicit end_date semantics",
  );
  failed = true;
}


for (const [label, source] of [
  ["event detail", files.detail],
  ["event search", files.search],
  ["planner", files.planner],
]) {
  if (!source.includes("legacyAgeGroup: event.age_group")) {
    console.error(`[event-data] ${label} must use legacy age_group only as fallback`);
    failed = true;
  }
}

for (const [label, source] of [
  ["shared public cards", files.publicEvents],
  ["event detail", files.detail],
  ["event search", files.search],
  ["favorites", files.favorites],
  ["planner", files.planner],
]) {
  if (!source.includes("formatEventAge")) {
    console.error(`[event-data] ${label} must use shared formatEventAge`);
    failed = true;
  }
}

if (
  files.publicEvents.includes('min === null && max === null) return "All ages"') ||
  files.favorites.includes('return locale === "en" ? "All ages"')
) {
  console.error("[event-data] missing age data must never be silently labelled All ages");
  failed = true;
}

if (!files.readiness.includes("不可把未知年齡估成「所有年齡」")) {
  console.error("[event-data] readiness copy must preserve truthful unknown-age handling");
  failed = true;
}

requireSignals("verified unknown-age correction", files.midAutumnAgeCorrection, [
  "主辦方未註明",
  "unknown/unstated age",
  "cpo.gov.hk",
  "丙午年中秋光影裝置｜香港文化中心露天廣場",
]);

if (/\bid\s*=\s*'[0-9a-f-]{36}'/i.test(files.midAutumnAgeCorrection)) {
  console.error("[event-data] corrective data migration must not depend on a generated event UUID");
  failed = true;
}

if (
  files.midAutumnAgeCorrection.includes("array['所有年齡']") ||
  files.midAutumnAgeCorrection.includes("array[\"所有年齡\"]")
) {
  console.error("[event-data] unstated organizer age restriction must not be inferred as 所有年齡");
  failed = true;
}

requireSignals("legacy 0–99 placeholder correction", files.agePlaceholderCorrection, [
  "age_min = 0",
  "age_max = 99",
  "age_min = null",
  "age_max = null",
  "主辦方未註明",
  "hkp.lcsd.gov.hk",
  "pmq.org.hk",
  "facebook.com/jackfruitfestival",
]);

if (/\bid\s*=\s*'[0-9a-f-]{36}'/i.test(files.agePlaceholderCorrection)) {
  console.error("[event-data] age placeholder correction must match verified source identity, not generated UUIDs");
  failed = true;
}

if (
  files.agePlaceholderCorrection.includes("array['所有年齡']") ||
  files.agePlaceholderCorrection.includes("array[\"所有年齡\"]")
) {
  console.error("[event-data] unsupported 0–99 placeholders must become 主辦方未註明, not 所有年齡");
  failed = true;
}

requireSignals("public events view", files.publicView, [
  "e.age_min",
  "e.age_max",
  "e.age_groups",
  "e.is_sen_friendly",
  "e.is_indoor",
]);

if (failed) process.exit(1);

console.log(
  "[event-data] OK — merchant submission, admin approval and public age/accessibility mapping retain the completeness contract.",
);
