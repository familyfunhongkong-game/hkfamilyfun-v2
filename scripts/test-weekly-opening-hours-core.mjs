import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// This suite tests the pure resolver without a database migration.
const raw = readFileSync("lib/events/weekly-opening-hours.ts", "utf8");
const js = ts.transpileModule(raw, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
}}).outputText;
const runtime = { exports: {} };
const calendarDayOfWeek = date => {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return -1;
  return new Date(date + "T12:00:00Z").getUTCDay();
};
runInNewContext(js, {
  module: runtime, exports: runtime.exports,
  require: () => ({ calendarDayOfWeek }), String, Number, Object, Array, Set,
}, { timeout: 3000 });
const { parseWeeklyOpeningHours, activeWeekdays, hoursForDate, resolveTimeForDate, updateWeekdayHours } = runtime.exports;
const schedule = parseWeeklyOpeningHours({
  "0": { start: "10:00", end: "18:00" },
  "5": { start: "14:00", end: "20:00" },
  "6": { start: "09:00", end: "19:00" },
});
assert.ok(schedule);
assert.deepEqual([...activeWeekdays(schedule)], [0,5,6]);
assert.equal(hoursForDate(schedule, "2026-10-17").start, "09:00");
assert.equal(resolveTimeForDate("2026-10-17", schedule, "10:00 - 18:00"), "09:00 - 19:00");
assert.equal(resolveTimeForDate("2026-10-16", schedule, "10:00 - 18:00"), "14:00 - 20:00");
assert.equal(resolveTimeForDate("2026-10-19", schedule, "10:00 - 18:00"), null);
assert.equal(resolveTimeForDate("2026-10-19", schedule, "10:00 - 18:00", true), "10:00 - 18:00");
assert.equal(resolveTimeForDate("2026-10-19", null, "10:00 - 18:00"), "10:00 - 18:00");
for (const invalid of [[], "09:00", { "7": { start: "09:00", end: "18:00" } }, { "1": { start: "18:00", end: "09:00" } }, { "1": { start: "25:00", end: "18:00" } }]) {
  assert.equal(parseWeeklyOpeningHours(invalid), null);
}
const changed = updateWeekdayHours(schedule, 5, null);
assert.equal(hoursForDate(changed, "2026-10-16"), null);
assert.equal(hoursForDate(schedule, "2026-10-16").start, "14:00");
console.log("[weekday-hours-core] PASS: weekday/weekend hours, closure, special dates, legacy fallback and validation");
