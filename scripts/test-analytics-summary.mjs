import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Test the real TypeScript summarizer with a fake read-only Supabase client:
// no changes to Production data or accounts.
const source = readFileSync("lib/admin-analytics-summary.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = { exports: {} };
runInNewContext(compiled, {
  module: runtime, exports: runtime.exports, Intl, Date, Error, Map, Set,
  Array, Object, Boolean, Number, String,
}, { timeout: 3000 });
const { getSiteAnalyticsSummary, AnalyticsReportLimitError } = runtime.exports;

function item(timestamp, type, path, opts = {}) {
  return {
    visitor_id: opts.visitor || "a1111111-1111-4111-8111-111111111111",
    session_id: opts.session || "b1111111-1111-4111-8111-111111111111",
    event_type: type,
    page_path: path,
    event_id: opts.event || null,
    occurred_at: timestamp,
    device_type: opts.device || "desktop",
    referrer_hostname: opts.referrer || null,
  };
}
const eventId = "c1111111-1111-4111-8111-111111111111";
const rows = [
  item("2026-10-15T15:30:00Z", "page_view", "/cookies"),
  item("2026-10-15T15:32:00Z", "page_view", "/cookies"),
  item("2026-10-15T15:34:00Z", "event_view", "/events/" + eventId, { event: eventId }),
  item("2026-10-15T15:35:00Z", "cta_click", "/events/" + eventId, { event: eventId }),
  item("2026-10-15T17:00:00Z", "page_view", "/privacy", {
    visitor: "a2222222-2222-4222-8222-222222222222",
    session: "b2222222-2222-4222-8222-222222222222",
    device: "mobile",
    referrer: "google.com",
  }),
  item("2026-10-15T17:01:00Z", "event_view", "/events/" + eventId, { event: eventId }),
];
const eventInfo = {
  id: eventId, title_tc: "家庭同樂日", title: "Family Fun Day",
  activity_category: "親子活動", category: null, district: "沙田",
};
function mocked(rowsToReturn = rows) {
  return {
    from(table) {
      if (table === "site_analytics_events") return {
        select() { return this; }, gte() { return this; },
        order() { return this; },
        async range(start, end) {
          return { data: rowsToReturn.slice(start, end + 1), error: null };
        },
      };
      if (table === "events") return {
        select() { return this; },
        async in(column, ids) {
          assert.equal(column, "id");
          return { data: ids.includes(eventId) ? [eventInfo] : [], error: null };
        },
      };
      throw new Error("Unexpected table: " + table);
    },
  };
}
const report = await getSiteAnalyticsSummary(mocked(), "2026-10-15T00:00:00Z");
assert.deepEqual(JSON.parse(JSON.stringify(report.totals)), {
  visitors: 2, sessions: 2, pageViews: 3, eventViews: 2, ctaClicks: 1,
});
assert.equal(report.trend.length, 2, "Hong Kong timezone must create two days");
assert.equal(report.trend[0].date, "2026-10-15");
assert.equal(report.trend[1].date, "2026-10-16");
assert.equal(report.topPages[0].path, "/cookies");
assert.equal(report.topPages[0].views, 2);
assert.equal(report.topEvents[0].title, "家庭同樂日");
assert.equal(report.topEvents[0].views, 2);
assert.equal(report.topEvents[0].clicks, 1);
assert.equal(report.categories[0].label, "親子活動");
assert.equal(report.categories[0].clicks, 1);
assert.equal(report.districts[0].views, 2);
assert.equal(report.devices.find(v => v.label === "mobile").views, 1);
assert.equal(report.referrers.find(v => v.label === "Direct").views, 2);

const summaryRoute = readFileSync("app/api/admin/analytics/route.ts", "utf8");
const exportRoute = readFileSync("app/api/admin/analytics/export/route.ts", "utf8");
for (const [name, route] of [["dashboard",summaryRoute], ["csv",exportRoute]]) {
  assert.match(route, /requireAdmin\(token\)/, name + " must authorize user");
  assert.match(route, /getSiteAnalyticsSummary\(client, /, name + " must use same summary");
  assert.doesNotMatch(route, /client\.rpc\("admin_site_analytics_summary"/, name + " must not use broken RPC");
  assert.match(route, /instanceof AnalyticsReportLimitError/, name + " must handle excess data");
}

const batch = Array.from({length: 21000}, (_, i) => ({
  ...rows[0], page_path: "/page/" + i,
}));
await assert.rejects(
  () => getSiteAnalyticsSummary(mocked(batch), "2026-10-15T00:00:00Z"),
  (e) => e instanceof AnalyticsReportLimitError,
  "Must fail clearly rather than silently truncate >20,000 rows",
);
console.log("[analytics-summary] PASS: counting, HK timezone, event joins, admin routes, 20,000-row limit");
