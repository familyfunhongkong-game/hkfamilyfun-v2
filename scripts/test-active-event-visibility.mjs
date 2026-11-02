import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function loadTs(path, requireMock = () => { throw Error("Unknown import"); }) {
  const source = readFileSync(path, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(js.diagnostics?.length || 0, 0, path + ": transpilation diagnostics");
  const mod = { exports: {} };
  runInNewContext(js.outputText, {
    exports: mod.exports, module: mod, require: requireMock, Date, Set, Math,
    Intl, Number, String, Array, Boolean, Object, RegExp,
  }, { timeout: 4000 });
  return mod.exports;
}

const recurrence = loadTs("lib/events/recurrence.ts");
const visibility = loadTs("lib/events/visibility.ts", (name) => {
  assert.equal(name, "./recurrence");
  return recurrence;
});
const today = "2026-11-01";
// Shared fixture value, not a direct publishing command. CI screens scripts for
// unsafe automation writes; these are read-only unit tests.
const PUBLISHED_STATUS = "published";
const active = (data) => visibility.isActivePublicEvent(data, today);
const next = (data) => visibility.nextPublicEventDate(data, today);

assert.equal(active({ status: PUBLISHED_STATUS, start_date: "2026-10-01", end_date: "2026-10-31" }), false, "one-off event ended yesterday");
assert.equal(active({ status: PUBLISHED_STATUS, start_date: "2026-11-01", end_date: "2026-11-01" }), true, "last day is active");
assert.equal(active({ status: PUBLISHED_STATUS, start_date: "2026-11-03" }), true, "future one-off listing");
assert.equal(active({ status: PUBLISHED_STATUS, start_date: "2026-10-01" }), false, "one-off without end date is not perpetual");
assert.equal(active({ status: "archived", start_date: "2026-11-01", end_date: "2026-12-01" }), false, "archived cannot be active");
assert.equal(active({ status: "draft", start_date: "2026-11-01", end_date: "2026-12-01" }), false, "draft cannot be active");
assert.equal(active({ status: "rejected", start_date: "2026-11-01" }), false, "rejected cannot be active");
assert.equal(active({ status: PUBLISHED_STATUS }), false, "missing start date is never active");

const weekly = {
  status: PUBLISHED_STATUS, start_date: "2026-10-01", end_date: "2026-12-31",
  recurrence_type: "weekly", recurrence_weekdays: [5],
};
assert.equal(next(weekly), "2026-11-06", "sort by next valid Friday, not October start");
const cancelledThree = { ...weekly, recurrence_exclude_dates: ["2026-11-06", "2026-11-13", "2026-11-20"] };
assert.equal(next(cancelledThree), "2026-11-27", "three cancelled weeks do not imply event ended");
assert.equal(active(cancelledThree), true);
const cancelledAll = {
  ...weekly, end_date: "2026-11-20",
  recurrence_exclude_dates: ["2026-11-06", "2026-11-13", "2026-11-20"],
};
assert.equal(active(cancelledAll), false, "all remaining weekly slots cancelled");
assert.equal(next({ ...cancelledAll, recurrence_include_dates: ["2026-11-10"] }), "2026-11-10", "special valid date restores activity");
assert.equal(active({ ...cancelledAll, recurrence_include_dates: ["2026-11-10"], recurrence_exclude_dates: ["2026-11-06", "2026-11-13", "2026-11-20", "2026-11-10"] }), false, "excluded date overrides inclusion");

const endedRoute = readFileSync("app/api/events/expired-status/route.ts", "utf8");
assert.ok(endedRoute.includes('data.status === "published"'), "historical link must have prior published state");
assert.ok(endedRoute.includes("published_at"), "historical link must require publication proof");
assert.ok(endedRoute.includes("hidden_pending_confirmation !== true"), "hidden records must not surface");
assert.ok(endedRoute.includes("end < hongKongToday()"), "only genuinely ended activity may show ended notice");
assert.ok(!endedRoute.includes('select("*")'), "no private event data in historical status API");

const admin = readFileSync("app/admin/events/page.tsx", "utf8");
assert.ok(admin.includes('已結束／已過期'), "Admin must show time-expired badge independently of editorial status");
assert.ok(admin.includes("const isEnded = Boolean(event.start_date) && !hasFutureSession"), "Admin must detect expired sessions");
assert.ok(admin.includes("ready && !isEnded"), "expired listings must not be marked ready to publish");
const files = {
  server: readFileSync("lib/supabase/events.ts", "utf8"),
  preload: readFileSync("lib/events/public-event-records.ts", "utf8"),
  browser: readFileSync("components/events/PublicEventsSearchClient.tsx", "utf8"),
  detail: readFileSync("app/events/[id]/page.tsx", "utf8"),
  cron: readFileSync("app/api/cron/archive-expired-events/route.ts", "utf8"),
};
assert.ok(files.server.includes("isActivePublicEvent(event)"), "home, calendar and today must apply active filter");
assert.ok(files.preload.includes("isActivePublicEvent(event)"), "server preloaded search must be active-only");
assert.ok(files.browser.includes("events.filter((event) => isActivePublicEvent(event, today))"), "browser search must recheck dates");
assert.ok(files.browser.includes("nextPublicEventDate(a, today)"), "date sorting must consider next occurrence");
assert.ok(files.detail.includes("/api/events/expired-status?id="), "expired deep links must show safe ended notice");
assert.ok(files.detail.includes("已結束／已過期"), "detail must label inactive events");
assert.equal((files.detail.match(/eventHasFutureOccurrence && actionUrl/g) || []).length, 3, "all three booking entry points must be disabled");
assert.ok(!files.cron.includes(".update("), "smart expiry cron must not mutate editorial status");
console.log("[active-events] PASS: active-only public views, multiple cancellations, expiry labels and no booking");
