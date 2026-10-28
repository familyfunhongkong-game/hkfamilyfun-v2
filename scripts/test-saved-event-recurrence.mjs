import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/events/recurrence.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = { exports: {} };
runInNewContext(compiled, { exports: runtime.exports, module: runtime, Date, String, Number, Array, Set, Math }, { timeout: 3000 });
const { nextEventOccurrence, eventOccursInRange, eventOccursOn } = runtime.exports;

const weekly = {
  startDate: "2026-10-01", endDate: "2026-12-31",
  recurrenceType: "weekly", recurrenceWeekdays: [5],
};
assert.equal(nextEventOccurrence(weekly, "2026-10-28"), "2026-10-30");
const longCancelled = {
  ...weekly,
  recurrenceExcludeDates: ["2026-10-30", "2026-11-06", "2026-11-13"],
};
assert.equal(nextEventOccurrence(longCancelled, "2026-10-28"), "2026-11-20", "3 closed weeks must not imply expiry");
assert.equal(nextEventOccurrence({ ...longCancelled, recurrenceIncludeDates: ["2026-10-29"] }, "2026-10-28"), "2026-10-29");
assert.equal(nextEventOccurrence({ ...weekly, recurrenceExcludeDates: ["2026-10-29", "2026-10-30"], recurrenceIncludeDates: ["2026-10-29"] }, "2026-10-28"), "2026-11-06", "closure overrides included date");
assert.equal(nextEventOccurrence({ ...weekly, endDate: null }, "2026-10-28"), "2026-10-30", "weekly without end date must remain open");
assert.equal(eventOccursOn({ ...weekly, endDate: null }, "2026-11-06"), true, "open-ended Friday occurs");
assert.equal(eventOccursInRange({ ...longCancelled, endDate: null }, "2026-10-28", "2026-11-19"), false);
assert.equal(eventOccursInRange({ ...longCancelled, endDate: null }, "2026-10-28", "2026-11-20"), true);
assert.equal(nextEventOccurrence({ ...weekly, endDate: "2026-10-29" }, "2026-10-28"), null, "ended weekly series");
assert.equal(nextEventOccurrence({ startDate: "2026-10-28", endDate: "2026-10-31", recurrenceType: "none", recurrenceExcludeDates: ["2026-10-28", "2026-10-29"] }, "2026-10-28"), "2026-10-30", "skip nonweekly closures");
assert.equal(nextEventOccurrence({ startDate: "2026-10-28", recurrenceType: "none" }, "2026-10-29"), null, "one-off past event");
console.log("[saved-recurrence] PASS: recurrence, closures, exceptions and open-ended series");
