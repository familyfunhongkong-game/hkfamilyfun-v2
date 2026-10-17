import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/events/today-schedule.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = { exports: {} };
runInNewContext(compiled, {
  module: runtime, exports: runtime.exports, String, Number, Array, Object, Infinity,
}, { timeout: 3000 });
const { startMinute, todayPeriod, displayTodayTime, groupTodaySchedule } = runtime.exports;
const fixture = [
  {id: "late", title: "晚間節目", time: "19:15 - 21:00"},
  {id: "unknown", title: "時間待定", time: "時間待定"},
  {id: "morning", title: "早上工作坊", time: "09:00 - 12:00"},
  {id: "afternoon", title: "午後展覽", time: "13:00 - 18:00"},
  {id: "midnight", title: "凌晨節目", time: "00:00 - 00:30"},
  {id: "one", title: "甲", time: "09:00"},
  {id: "two", title: "乙", time: "09:00"},
  {id: "unreliable", title: "沒有可用開始時間", time: "未有確定時段"},
  {id: "edge", title: "午夜前", time: "23:59"},
  {id: "bad", title: "錯誤時間", time: "25:00"},
];
const snapshot = JSON.stringify(fixture);
const grouped = groupTodaySchedule(fixture);
const ids = (items) => items.map(x => x.id);
const sameTimeMorning = fixture.filter(x => ["morning","one","two"].includes(x.id))
  .sort((a,b) => a.title.localeCompare(b.title, "zh-HK")).map(x => x.id);
assert.deepEqual([...ids(grouped.morning)], ["midnight", ...sameTimeMorning]);
assert.deepEqual([...ids(grouped.afternoon)], ["afternoon"]);
assert.deepEqual([...ids(grouped.evening)], ["late", "edge"]);
assert.deepEqual([...ids(grouped.unscheduled)], ["unknown", "unreliable", "bad"].sort((a,b) => {
  const titles = Object.fromEntries(fixture.map(x => [x.id,x.title]));
  return titles[a].localeCompare(titles[b], "zh-HK");
}));
assert.equal(JSON.stringify(fixture), snapshot, "Sorting must not mutate original published events");
assert.equal(startMinute({time:"09:00 - 12:00"}), 540);
assert.equal(startMinute({time:"00:00"}), 0);
assert.equal(startMinute({time:"23:59"}), 1439);
assert.equal(startMinute({time:"24:00"}), null);
assert.equal(startMinute({time:"Time TBC"}), null);
assert.equal(todayPeriod({time:"12:00"}), "afternoon");
assert.equal(todayPeriod({time:"18:00"}), "evening");
assert.equal(todayPeriod({time:"Time TBC"}), "unscheduled");
assert.equal(displayTodayTime({time:"09:00 - 18:00"}).start, "09:00");
assert.equal(displayTodayTime({time:"09:00 - 18:00"}).end, "18:00");
assert.equal(displayTodayTime({time:"時間待定"}).start, null);
const page = readFileSync("app/today/page.tsx","utf8");
const row = readFileSync("components/events/TodayScheduleRow.tsx","utf8");
assert.match(page, /eventOccursOn\(/, "Today must filter by real recurrence");
assert.match(page, /timeZone: "Asia\/Hong_Kong"/, "Today must use Hong Kong date");
assert.match(page, /groupTodaySchedule\(todayEvents\)/);
assert.match(page, /TODAY_PERIODS.filter\(/);
assert.match(page, /href=\{`#today-\$\{period\}`\}/);
assert.match(row, /grid-cols-\[3\.9rem_5rem_minmax\(0,1fr\)\]/, "Rows must fit mobile");
assert.match(row, /object-contain/, "Event posters must not be aggressively cropped");
assert.match(row, /event.price/, "Display fees directly on today's list");
assert.match(row, /event.district/, "Display location directly on today's list");
assert.match(row, /href=\{`\/events\/\$\{event.id\}`\}/, "Whole row must navigate to detail");
assert.doesNotMatch(row, /shortDescription|addToCalendar|toggleFavorite|event\.organizer/, "Today rows should not carry full event card details");
console.log("[today-timeline] PASS: HK-time ascending, ties, missing times last, recurrence, mobile compact row, fee and venue");
