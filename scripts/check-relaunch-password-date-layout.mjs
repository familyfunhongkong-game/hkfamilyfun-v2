import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = (path) => readFileSync(path, "utf8");
const parent = source("components/auth/parent-email-account.tsx");
const reset = source("app/account/reset-password/page.tsx");
const detail = source("app/events/[id]/page.tsx");
const list = source("components/events/PublicEventCard.tsx");
const search = source("components/events/PublicEventsSearchClient.tsx");

assert.ok(parent.includes('mode === "register" && password.length < 8'), "Parent registration must allow 8 characters");
assert.ok(parent.includes('minLength={mode === "register" ? 8 : undefined}'), "Login must not reject existing short passwords before Auth");
assert.ok(parent.includes("（至少 8 字元）"), "Parent UI must show 8-character policy");
assert.ok(!parent.includes("password.length < 10"), "Old 10-character parent policy returned");
assert.ok(reset.includes("password.length < 8"), "Reset must allow 8-character passwords");
assert.equal((reset.match(/minLength=\\{8\\}/g) || []).length, 2, "Reset/confirm fields must both use 8");
assert.ok(!reset.includes("minLength={10}"), "Old reset minLength returned");

assert.ok(detail.includes("unclamped ?"), "Event fact row needs uncapped date wrapping");
assert.equal((detail.match(/unclamped\\s*\\/>/g) || []).length, 2, "Hero and sidebar dates must both render fully");
assert.ok(detail.includes('className="col-span-2 sm:col-span-1"'), "Date row must use full mobile width");
assert.ok(list.includes("fullText ?"), "List date needs uncapped wrapping");
assert.ok(list.includes("value={dateText}\\n            fullText"), "Full event card dates must not truncate");
assert.ok(list.includes("{dateText}\\n            </p>"), "Compact event card must display date separately");
assert.ok(!list.includes("{dateText} · {event.time}"), "Compact date and time must not share a clipped line");
assert.ok(search.includes('className="mt-0.5 whitespace-normal break-words font-extrabold leading-4 text-slate-800 [overflow-wrap:anywhere]">{formatDateRange(event, locale)}'), "Search dates must show the complete range");

const exports = {};
const transformed = ts.transpileModule(source("lib/events/card-date.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(transformed, { exports, module: { exports }, Date, Intl });
const { formatEventCardDate } = exports;
const crossYear = formatEventCardDate("2026-04-23", "2027-03-10", "zh-Hant");
assert.ok(crossYear.includes("2026") && crossYear.includes("2027"), "Cross-year range must retain both years");
const compactCrossYear = formatEventCardDate("2026-04-23", "2027-03-10", "zh-Hant", true);
assert.ok(compactCrossYear.includes("2026年") && compactCrossYear.includes("2027年"), "Compact cross-year range must retain both years");
assert.equal(formatEventCardDate("invalid", "2027-03-10", "zh-Hant"), "日期待定");
console.log("[relaunch-password-date] PASS — parent 8-char policy, untruncated mobile dates, cross-year formatting");
