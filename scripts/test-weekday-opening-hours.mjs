import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/events/weekly-opening-hours.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const runtime = { exports: {} };
const calendarDayOfWeek = (s) => {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return -1;
  return new Date(s + "T12:00:00Z").getUTCDay();
};
runInNewContext(compiled, {
  module:runtime, exports:runtime.exports,
  require: () => ({calendarDayOfWeek}),
  String, Number, Object, Array, Boolean, Set,
},{timeout:3000});
const {
  parseWeeklyOpeningHours, updateWeekdayHours, activeWeekdays,
  hoursForDate, resolveTimeForDate,
} = runtime.exports;

const venueHours = {
  "0":{start:"11:00",end:"20:00"},
  "1":{start:"12:00",end:"20:00"},
  "2":{start:"12:00",end:"20:00"},
  "3":{start:"12:00",end:"20:00"},
  "4":{start:"12:00",end:"20:00"},
  "5":{start:"12:00",end:"20:00"},
  "6":{start:"11:00",end:"20:00"},
};
const valid = parseWeeklyOpeningHours(venueHours);
assert.ok(valid);
assert.deepEqual([...activeWeekdays(valid)], [0,1,2,3,4,5,6]);
assert.equal(hoursForDate(valid,"2026-10-17").start,"11:00"); // Saturday
assert.equal(hoursForDate(valid,"2026-10-19").start,"12:00"); // Monday
assert.equal(resolveTimeForDate("2026-10-17",valid,"12:00 - 20:00"),"11:00 - 20:00");
assert.equal(resolveTimeForDate("2026-10-19",valid,"11:00 - 20:00"),"12:00 - 20:00");
assert.equal(resolveTimeForDate("2026-10-19",null,"12:00 - 20:00"),"12:00 - 20:00");
const weekend = {
  "5":{start:"14:00",end:"20:00"},
  "6":{start:"11:00",end:"19:00"},
  "0":{start:"11:00",end:"19:00"},
};
assert.equal(resolveTimeForDate("2026-10-19",weekend,"10:00 - 18:00"),null,
  "Closed weekdays must not show up in Today");
assert.equal(resolveTimeForDate("2026-10-19",weekend,"10:00 - 18:00",true),
  "10:00 - 18:00","Explicit additional dates keep verified fallback hours");
assert.equal(resolveTimeForDate("2026-10-17",weekend,"10:00 - 18:00"),
  "11:00 - 19:00");
assert.equal(parseWeeklyOpeningHours(null),null);
for(const invalid of [
  [],"09:00", {"7":{start:"09:00",end:"17:00"}},
  {"1":{start:"25:00",end:"17:00"}},
  {"1":{start:"16:00",end:"10:00"}},
  {"1":{start:"09:00",end:"09:00"}},
  {"1":{start:"09:00",end:"17:00",extra:"x"}},
  {"1":null},
]) assert.equal(parseWeeklyOpeningHours(invalid),null);
const mutable = updateWeekdayHours(valid,1,null);
assert.equal(mutable["1"],undefined);
assert.ok(valid["1"],"original object must never be mutated");
const added = updateWeekdayHours(mutable,1,{start:"13:00",end:"20:00"});
assert.equal(added["1"].start,"13:00");
assert.equal(added["6"].start,"11:00");

const edit = readFileSync("app/merchant/events/[id]/edit/page.tsx","utf8");
const today = readFileSync("app/today/page.tsx","utf8");
const detail = readFileSync("app/events/[id]/page.tsx","utf8");
const sql = readFileSync("supabase/migrations/20261017193000_add_weekday_opening_hours.sql","utf8");
const data = readFileSync("lib/supabase/events.ts","utf8");
for (const needle of [
  "weekly_opening_hours: form.weekly_opening_hours",
  "activeWeekdays(form.weekly_opening_hours)",
  'missingColumn === "weekly_opening_hours"',
  "各星期幾使用不同開放時間",
  "parseWeeklyOpeningHours(form.weekly_opening_hours)",
]) assert.ok(edit.includes(needle),"Missing editor safeguard: "+needle);
assert.match(today,/getPublishedWeeklyOpeningHours\(/);
assert.match(today,/resolveTimeForDate\(/);
assert.match(today,/if \(resolved === null\) return \[\]/);
assert.match(detail,/weekly_opening_hours/);
assert.match(detail,/HK_WEEKDAYS\.map\(/);
assert.match(data,/\.eq\("status", "published"\)/);
assert.match(sql,/add column if not exists weekly_opening_hours jsonb/);
assert.match(sql,/hkff_valid_weekly_opening_hours/);
assert.match(sql,/issue #52/);
assert.doesNotMatch(sql,/drop table .*events/i);
console.log("[weekday-hours] PASS: 7-day schedule, weekday/weekend hours, closed days, overrides, schema guard, detailed page");
