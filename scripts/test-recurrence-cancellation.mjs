import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/events/recurrence.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = { exports: {} };
runInNewContext(js, { exports: runtime.exports, module: runtime, Date, String, Number, Array }, { timeout: 3000 });
const { eventOccursOn, eventOccursInRange } = runtime.exports;
const schedule = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  recurrenceType: "weekly",
  recurrenceWeekdays: [5, 6, 0],
  recurrenceIncludeDates: ["2026-10-19", "2026-10-17"],
  recurrenceExcludeDates: ["2026-10-17", "2026-10-18"],
};
assert.equal(eventOccursOn(schedule, "2026-10-16"), true, "Friday active");
assert.equal(eventOccursOn(schedule, "2026-10-17"), false, "Cancelled Saturday overrides inclusion");
assert.equal(eventOccursOn(schedule, "2026-10-18"), false, "Cancelled Sunday hidden");
assert.equal(eventOccursOn(schedule, "2026-10-19"), true, "Explicit Monday inclusion");
assert.equal(eventOccursOn(schedule, "2026-10-20"), false, "Ordinary Tuesday hidden");
assert.equal(eventOccursOn(schedule, "2026-11-01"), false, "Outside end date hidden");
assert.equal(eventOccursInRange(schedule, "2026-10-17", "2026-10-18"), false, "Closed weekend absent in calendar");
assert.equal(eventOccursInRange(schedule, "2026-10-17", "2026-10-19"), true, "Special opening visible");
const multiDay = {
  startDate: "2026-10-17", endDate: "2026-10-19",
  recurrenceType: "none", recurrenceExcludeDates: ["2026-10-17", "2026-10-18"],
};
assert.equal(eventOccursOn(multiDay, "2026-10-17"), false, "Non-weekly closure hidden");
assert.equal(eventOccursOn(multiDay, "2026-10-18"), false, "Second non-weekly closure hidden");
assert.equal(eventOccursOn(multiDay, "2026-10-19"), true, "Following open day visible");
assert.equal(eventOccursInRange(multiDay, "2026-10-17", "2026-10-18"), false, "Cancelled non-weekly days absent from calendar");
assert.equal(eventOccursInRange(multiDay, "2026-10-17", "2026-10-19"), true, "Remaining open day visible in calendar");
const entirelyClosed = { ...multiDay, recurrenceExcludeDates: ["2026-10-17", "2026-10-18", "2026-10-19"] };
assert.equal(eventOccursInRange(entirelyClosed, "2026-10-17", "2026-10-19"), false, "Fully closed multi-day event absent");
console.log("[recurrence-cancellation] PASS: closed days beat inclusions; weekend and special dates are accurate");
