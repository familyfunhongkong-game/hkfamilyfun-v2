import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function importPureTs(path) {
  const source = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const runtime = { exports: {} };
  runInNewContext(compiled, {
    module: runtime,
    exports: runtime.exports,
    Intl,
    Date,
    Number,
    String,
    require: (name) => {
      if (name === "@/lib/i18n/config") return {
        uiText: (locale, tc, sc, en) => locale === "en" ? en : locale === "zh-Hans" ? sc : tc,
      };
      throw new Error("Unexpected dependency: " + name);
    },
  }, { timeout: 3000 });
  return runtime.exports;
}

const { formatEventCardDate } = importPureTs("lib/events/card-date.ts");
const acrossYears = formatEventCardDate("2026-04-23", "2027-03-10", "zh-Hant");
assert.match(acrossYears, /2026/);
assert.match(acrossYears, /2027/);
const featuredCross = formatEventCardDate("2026-04-23", "2027-03-10", "zh-Hant", true);
assert.equal(featuredCross, "2026年4月23日 – 2027年3月10日");
assert.equal(formatEventCardDate("2026-10-24", undefined, "zh-Hant", true), "10月24日");
assert.equal(formatEventCardDate("2026-10-24", "2026-10-25", "zh-Hant", true), "10月24日 – 10月25日");
assert.equal(formatEventCardDate("2026-02-30", undefined, "zh-Hant", true), "日期待定");
assert.equal(formatEventCardDate("2026-10-24", undefined, "en", true), "24/10/2026");
assert.match(formatEventCardDate("2026-12-31", "2027-01-02", "en"), /2027/);
const { formatEventCategory } = importPureTs("lib/events/display-normalization.ts");
for (const [code, zhHant, en] of [
  ["family_exhibition", "親子展覽", "Family Exhibition"],
  ["family_entertainment", "親子娛樂", "Family Entertainment"],
  ["cultural_event", "文化活動", "Cultural Event"],
  ["digital_art", "數碼藝術", "Digital Art"],
  ["fair", "嘉年華", "Fair"],
]) {
  assert.equal(formatEventCategory(code, "zh-Hant"), zhHant);
  assert.equal(formatEventCategory(code, "en"), en);
}
const { formatWeeklyDays } = importPureTs("lib/events/weekly-label.ts");
assert.equal(formatWeeklyDays([5, 6, 0], "zh-Hant"), "逢星期五、六、日");
assert.equal(formatWeeklyDays([0, 6, 5], "en"), "Every Fri, Sat, Sun");
assert.equal(formatWeeklyDays([0, 1, 2, 3, 4, 5, 6], "zh-Hans"), "每天开放");
assert.equal(formatWeeklyDays([0, 0, 8, -1, 2.5], "zh-Hant"), "逢星期日");
assert.equal(formatWeeklyDays(undefined, "zh-Hant"), "");
const publicCardSource = readFileSync("components/events/PublicEventCard.tsx", "utf8");
assert.match(publicCardSource, /const weeklyLabel = event\.recurrenceType === "weekly"/);
assert.match(readFileSync("components/events/FeaturedEditorialCard.tsx", "utf8"), /formatWeeklyDays\(event\.recurrenceWeekdays, locale\)/);
console.log("[public-formatting] PASS — cross-year dates, short single-day dates and category localization");
