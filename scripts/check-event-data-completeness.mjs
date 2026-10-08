import { readFile } from "node:fs/promises";

const files = {
  merchant: await readFile("app/merchant/events/[id]/edit/page.tsx", "utf8"),
  adminDetail: await readFile("app/admin/events/[id]/page.tsx", "utf8"),
  adminList: await readFile("app/admin/events/page.tsx", "utf8"),
  readiness: await readFile("lib/events/readiness.ts", "utf8"),
  age: await readFile("lib/events/age-display.ts", "utf8"),
  publicEvents: await readFile("lib/supabase/events.ts", "utf8"),
  detail: await readFile("app/events/[id]/page.tsx", "utf8"),
  search: await readFile("app/events/page.tsx", "utf8"),
  favorites: await readFile("app/favorites/page.tsx", "utf8"),
  planner: await readFile("app/planner/page.tsx", "utf8"),
  publicCard: await readFile("components/events/PublicEventCard.tsx", "utf8"),
  publicType: await readFile("lib/types.ts", "utf8"),
  publicView: await readFile(
    "supabase/migrations/20260921114034_add_sanitized_public_events_view.sql",
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
  'value === "所有年齡"',
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

requireSignals("admin detail", files.adminDetail, [
  'evaluateEventReadiness',
  'event.age_groups || event.age_group',
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
]);

requireSignals("age display", files.age, [
  '"所有年齡"',
  '"All ages"',
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
