import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/events/recurrence.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = { exports: {} };
runInNewContext(js, { module: runtime, exports: runtime.exports, Date, String, Number, Array, Set, Math }, { timeout: 3000 });
const { nextEventOccurrence } = runtime.exports;
const weekly = {
  startDate: "2026-01-01", endDate: "2026-12-31",
  recurrenceType: "weekly", recurrenceWeekdays: [5, 6, 0],
  recurrenceIncludeDates: [], recurrenceExcludeDates: [],
};
assert.equal(nextEventOccurrence(weekly, "2026-10-20"), "2026-10-23", "Fri–Sun activity sorts by actual next Friday");
assert.equal(nextEventOccurrence(weekly, "2026-10-24"), "2026-10-24", "Today's Saturday occurrence is included");
assert.equal(nextEventOccurrence(weekly, "2026-10-26"), "2026-10-30", "Past Monday must not become the next opening");
assert.equal(nextEventOccurrence(weekly, "2027-01-01"), null, "An expired event cannot reappear");
assert.equal(nextEventOccurrence({ ...weekly, recurrenceExcludeDates: ["2026-10-23", "2026-10-24", "2026-10-25"] }, "2026-10-20"), "2026-10-30", "Three closed days skip to next actual open day");
assert.equal(nextEventOccurrence({ ...weekly, recurrenceIncludeDates: ["2026-10-21"] }, "2026-10-20"), "2026-10-21", "Special Wednesday opening beats normal Friday");
assert.equal(nextEventOccurrence({ ...weekly, recurrenceIncludeDates: ["2026-10-21"], recurrenceExcludeDates: ["2026-10-21"] }, "2026-10-20"), "2026-10-23", "Cancellations override special inclusions");
assert.equal(nextEventOccurrence({ ...weekly, recurrenceWeekdays: [], recurrenceIncludeDates: ["2026-11-15"] }, "2026-10-24"), "2026-11-15", "Explicit-only rare opening is respected");
assert.equal(nextEventOccurrence({ ...weekly, recurrenceWeekdays: [] }, "2026-10-24"), null, "Weekly event with no selected days is not fabricated");
const consecutive = { startDate: "2026-10-20", endDate: "2026-10-26", recurrenceType: "none", recurrenceExcludeDates: ["2026-10-24", "2026-10-25"] };
assert.equal(nextEventOccurrence(consecutive, "2026-10-23"), "2026-10-23");
assert.equal(nextEventOccurrence(consecutive, "2026-10-24"), "2026-10-26", "Multi-day closure weekend is skipped");
assert.equal(nextEventOccurrence(consecutive, "2026-10-27"), null);
assert.equal(nextEventOccurrence({ startDate: "2026-10-24", recurrenceType: "none" }, "2026-10-24"), "2026-10-24", "One-day events remain available on the specified day");
assert.equal(nextEventOccurrence({ startDate: "2026-10-24", recurrenceType: "none" }, "2026-10-25"), null, "One-day events expire properly");
assert.equal(nextEventOccurrence({ startDate: null }, "2026-10-24"), null, "Unknown start date must not be fabricated");
assert.equal(nextEventOccurrence({ startDate: "2026-10-24" }, "2026/10/24"), null, "Malformed today date must fail closed");
const page = readFileSync("app/favorites/page.tsx", "utf8");
assert.ok(page.includes('recurrence_type,recurrence_weekdays,recurrence_include_dates,recurrence_exclude_dates'));
assert.ok(page.includes('nextEventOccurrence('));
assert.ok(page.includes('"Next open"'));
assert.ok(page.includes('.from("public_events_i18n")'), "Saved events must stay on publicly visible view");
assert.ok(!page.includes('.from("events")'), "Do not access private event table in browser");
console.log("[saved-occurrence] PASS — recurrent next dates, exceptions, closures, one-day expiry, visibility contract");
