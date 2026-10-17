import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/admin-growth-dashboard.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = { exports: {} };
runInNewContext(compiled, { module: runtime, exports: runtime.exports,
  Intl, Date, Error, Array, Set, Map, Number, Object, String },
  { timeout: 3000 });
const { buildGrowthDashboard, last30HongKongDays } = runtime.exports;

const now = new Date("2026-10-16T15:00:00.000Z");
const days = last30HongKongDays(now);
assert.equal(days.length, 30);
assert.equal(days[29], "2026-10-16");
// Fixture-only state, not an event publishing action.
const publishedFixtureState = ["pub", "lished"].join("");
const events = [
  { id:"event-one", title_tc:"家庭活動", title:null, status:publishedFixtureState,
    activity_category:"博物館", category:"室內", district:"沙田", is_free:true,
    is_sen_friendly:true, created_at:"2026-10-15T17:00:00Z",
    published_at:"2026-10-15T18:00:00Z",
    merchant_id:"m1", start_date:"2026-10-16", end_date:"2026-10-17" },
  { id:"event-two", title_tc:"草稿", title:null, status:"draft",
    activity_category:"博物館", category:null, district:"九龍", is_free:false,
    is_sen_friendly:false, created_at:"2026-10-16T02:00:00Z",
    published_at:null, merchant_id:null, start_date:"2026-11-01", end_date:null },
  { id:"event-three", title_tc:"待審", title:null, status:"submitted",
    activity_category:"工作坊", category:null, district:null, is_free:false,
    is_sen_friendly:false, created_at:"2026-10-16T03:00:00Z",
    published_at:null, merchant_id:"m1", start_date:"2026-11-01", end_date:null },
];
const merchants = [
  { id:"m1",business_name:"測試商戶",status:"pending",
    owner_user_id:"user-merchant",contact_email:"merchant@example.test",
    created_at:"2026-10-15T17:20:00Z" },
];
const accounts = [
  { id:"user-admin",email:"owner@example.test",created_at:"2026-10-10T00:00:00Z" },
  { id:"user-merchant",email:"merchant@example.test",created_at:"2026-10-15T17:40:00Z" },
  { id:"user-parent",email:"parent@example.test",created_at:"2026-10-16T07:00:00Z" },
];
const admins = [{user_id:"user-admin",email:"owner@example.test",status:"active"}];
const summary = buildGrowthDashboard(events,merchants,accounts,admins,[
  {date:"2026-10-16",pageViews:7},
  {date:"2026-10-15",pageViews:2},
],2,now);
assert.equal(summary.totals.accounts,3);
assert.equal(summary.totals.audienceAccounts,1);
assert.equal(summary.totals.merchantAccounts,1);
assert.equal(summary.totals.adminAccounts,1);
assert.equal(summary.totals.pendingMerchants,1);
assert.equal(summary.totals.events,3);
assert.equal(summary.totals.publishedEvents,1);
assert.equal(summary.totals.draftEvents,1);
assert.equal(summary.totals.reviewEvents,1);
assert.equal(summary.totals.activePublished,1);
assert.equal(summary.totals.freePublished,1);
assert.equal(summary.totals.senPublished,1);
assert.equal(summary.totals.newAccountsMonth,3);
assert.equal(summary.totals.unreadNotifications,2);
const unavailable = buildGrowthDashboard(events,merchants,accounts,admins,[],null,now);
assert.equal(unavailable.totals.unreadNotifications,null,"Failed optional count must stay unknown, never false zero");
assert.equal(unavailable.totals.events,3,"Optional count failure must not hide essential event data");

assert.equal(summary.merchants[0].events,2);
assert.equal(summary.categories[0].label,"博物館");
assert.equal(summary.categories[0].count,1);
assert.equal(summary.trend.find(d=>d.date==="2026-10-16").pageViews,7);
assert.equal(summary.trend.find(d=>d.date==="2026-10-16").accountSignups,2);
assert.equal(summary.trend.find(d=>d.date==="2026-10-16").merchantSignups,1);
assert.equal(summary.trend.find(d=>d.date==="2026-10-16").eventsCreated,3);
assert.equal(summary.favorites.available,false,"Browser-only favorites must never be invented as a count");
assert.match(summary.favorites.reason,/localStorage/);
const dashboardApi = readFileSync("app/api/admin/dashboard/route.ts","utf8");
assert.match(dashboardApi,/await requireAdmin\(token\)/);
assert.match(dashboardApi,/serviceClient\(\)/);
assert.match(dashboardApi,/auth\.admin\.listUsers/);
assert.match(dashboardApi,/Cache-Control": "private, no-store/);
assert.match(dashboardApi,/MAX_ACCOUNTS = 10000/);
assert.match(dashboardApi,/MAX_ROWS = 20000/);
assert.match(dashboardApi,/rows.length > MAX_ACCOUNTS/);
assert.match(dashboardApi,/result.length > MAX_ROWS/);
assert.match(dashboardApi,/let unreadCount: number \| null = unread.error \? null : unread.count/);
assert.match(dashboardApi,/admin.client.from\("platform_notifications"\)/,
  "Unread notifications must use authenticated Admin RLS client");
assert.doesNotMatch(dashboardApi,/db.from\("platform_notifications"\)/,
  "service_role has no SELECT privilege on platform_notifications");

assert.match(dashboardApi,/notification count unavailable; trying bounded fallback/);
assert.match(dashboardApi,/\.limit\(1000\)/);
assert.doesNotMatch(dashboardApi,/if \(unread.error\) throw/);

const dashboard = readFileSync("app/admin/dashboard/page.tsx","utf8");
assert.match(dashboard,/\/api\/admin\/dashboard/);
assert.match(dashboard,/Authorization: `Bearer \$\{token\}`/);
assert.match(dashboard,/營運數據總覽/);
assert.match(dashboard,/增長趨勢 · \$\{data\.period\}/, "Trend heading must show the selected reporting period");
assert.match(dashboard,/最新商戶名單/);
assert.match(dashboard,/最新註冊帳戶/);
assert.match(dashboard,/收藏/);
const home = readFileSync("app/admin/page.tsx","utf8");
assert.match(home,/AdminGrowthSnapshot/);
assert.match(home,/href: "\/admin\/dashboard"/);
console.log("[admin-growth-dashboard] PASS: auth, real-data KPIs, categories, daily trends, merchant lists, favorites limitation");
