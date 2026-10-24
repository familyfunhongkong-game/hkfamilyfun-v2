import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const home = read("components/admin/AdminGrowthSnapshot.tsx");
const dashboard = read("app/admin/dashboard/page.tsx");
const operations = read("app/admin/operations/page.tsx");
const events = read("app/admin/events/page.tsx");
const merchants = read("app/admin/merchants/page.tsx");
const adminHome = read("app/admin/page.tsx");

const routes = [
  "/admin/analytics", "/admin/dashboard", "/admin/events", "/admin/merchants",
  "/admin/notifications", "/admin/intake", "/admin/content", "/admin/promotions",
  "/admin/social", "/admin/users", "/admin/operations",
];
for (const url of routes) assert.ok(existsSync("app" + url + "/page.tsx"), "Dashboard link target does not exist: " + url);

for (const url of ["/admin/analytics", "/admin/dashboard#recent-accounts", "/admin/merchants", "/admin/events", "/admin/notifications"]) {
  assert.ok(home.includes(url), "Home tile missing data destination: " + url);
}
assert.ok(home.includes('href={item.href}'), "All home KPIs must render keyboard-accessible links");
assert.ok(dashboard.includes('id="recent-accounts"'), "Auth accounts must jump to genuine accounts table, not Admin role editor");
assert.ok(dashboard.includes('window.location.hash === "#recent-accounts"'), "Account deep link must scroll after data request");
assert.ok(dashboard.includes('href="/admin/dashboard#recent-accounts"'), "Full dashboard account KPI must point to accounts table");
assert.ok(dashboard.includes('href="/admin/merchants?status=pending"'), "Pending merchants KPI must filter pending queue");
assert.ok(dashboard.includes('href="/admin/events?status=submitted"'), "Submitted events KPI must filter actual review queue");
assert.ok(dashboard.includes('href="/admin/events?status=published"'), "Published event KPI must lead to editable Admin list");
assert.ok(dashboard.includes('merchant_id=${encodeURIComponent(m.id)}'), "Each merchant table name must go to exact merchant ID");
assert.ok(dashboard.includes('hrefForRow={(label) =>'), "Grouped analytics must offer direct row actions");
assert.ok(dashboard.includes('href?: string; id?: string;'), "Dashboard table headings must support a visible management destination");
assert.ok(dashboard.includes('一般用戶目前沒有後台修改功能'), "Don't misrepresent read-only Auth account records as editable");

assert.ok(events.includes('new URLSearchParams(window.location.search)'), "Events queue must read dashboard filters");
assert.ok(events.includes('statusFilters.some((item) => item.key === status)'), "Event status input must be allowlisted");
assert.ok(events.includes('setSearchText(keyword.slice(0, 150))'), "Event categories/district deep link must filter safely");
assert.ok(merchants.includes('new URLSearchParams(window.location.search)'), "Merchant dashboard filters must be functional");
assert.ok(merchants.includes('merchant.id === selectedMerchantId'), "Exact merchant links must select correct record");
assert.ok(merchants.includes('merchant.status === statusFilter'), "Pending merchant filter must affect real rows");
assert.ok(merchants.includes('aria-pressed={statusFilter === key}'), "Merchant status cards must be real buttons");

for (const url of [
  'href="/admin/events?status=submitted"',
  'href="/admin/merchants?status=pending"',
  'href="/admin/operations#data-sources"',
  'href="/admin/operations#sync-history"',
]) assert.ok(operations.includes(url), "Operations metric card missing correct destination: " + url);
assert.ok(operations.includes('id="data-sources"') && operations.includes('id="sync-history"'), "Operations anchors must exist");
assert.ok(operations.includes('window.requestAnimationFrame'), "Async Operations anchor must scroll after data loads");
assert.ok(operations.includes('summary.latestSync'), "Sync Runs card must point to actual latest sync record, not a fake page");

assert.ok(adminHome.includes("<AdminGrowthSnapshot />"), "Admin home must retain operational snapshot");
assert.ok(adminHome.includes('rpc("is_super_admin")'), "Super Admin access boundaries must be retained");
console.log("[admin-dashboard-navigation] PASS — clickable KPIs, correct filtered queues, exact merchants, read-only accounts, source and sync anchors, protected existing Admin routes");
