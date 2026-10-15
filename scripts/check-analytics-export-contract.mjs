import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("app/api/admin/analytics/export/route.ts", "utf8");
const page = readFileSync("app/admin/analytics/page.tsx", "utf8");
const reports = readFileSync("app/admin/reports/page.tsx", "utf8");

// No public or unauthenticated analytics rows.
assert.match(api, /await requireAdmin\(token\)/);
assert.match(api, /if \(!admin.ok\)/);
assert.match(api, /"Authorization"/i);
assert.match(api, /"Cache-Control": "private, no-store, max-age=0"/);
assert.match(api, /Content-Disposition/);

// Both summary and detailed CSV are available without exposing unique
// visitor/session pseudonyms in downloads.
assert.match(api, /mode !== "events" && mode !== "summary"/);
assert.match(api, /admin_site_analytics_summary/);
assert.match(api, /from\("site_analytics_events"\)/);
assert.match(api, /\.select\("id,occurred_at,event_type,page_path,event_id,referrer_hostname,device_type"\)/);
assert.doesNotMatch(api, /\.select\([^\n]*visitor_id/);
assert.doesNotMatch(api, /\.select\([^\n]*session_id/);
assert.match(api, /occurred_at_hong_kong/);
assert.match(api, /MAX_ROWS = 20000/);
assert.match(api, /if \(rows.length > MAX_ROWS\)/);
assert.match(api, /\.range\(offset, offset \+ PAGE_SIZE - 1\)/);

// CSV must be Excel-compatible, spreadsheet-formula safe and avoid silent truncation.
assert.match(api, /"\\uFEFF"/);
assert.match(api, /replace\(\/\x22\/g, '\x22\x22'\)/);
assert.match(api, /"'" \+ text/);
assert.match(api, /status: 413/);
assert.match(api, /367 \* 86400000/);
assert.match(api, /Asia\/Hong_Kong/);

// Actual authenticated download buttons, selected date filters and user feedback.
assert.match(page, /exportCsv\("summary"\)/);
assert.match(page, /exportCsv\("events"\)/);
assert.match(page, /Authorization: `Bearer \$\{token\}`/);
assert.match(page, /startFor\(range\)\.toISOString\(\)/);
assert.match(page, /URL\.createObjectURL\(blob\)/);
assert.match(page, /role="alert"/);
assert.match(page, /timeZone:"Asia\/Hong_Kong"/);
assert.match(reports, /href="\/admin\/analytics"/);

console.log("[analytics-export] PASS admin-only, paging, privacy, CSV safety and date-range UI");
