import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const templateSource = fs.readFileSync("lib/merchant-notification-email.ts", "utf8");
const js = ts.transpileModule(templateSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { merchantNotificationEmailHtml } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

const url = "https://www.hkfamilyfun.com/admin/merchants?merchant_id=123&status=pending";
const html = merchantNotificationEmailHtml({
  heading: "🎉 測試通知",
  intro: "請核對資料。",
  details: [{ label: "商戶", value: '<script>alert("x")</script>' }],
  actionLabel: "查看審批",
  actionUrl: url,
  note: "需要登入。",
});

assert.match(html, /HK Family Fun 🎉/);
assert.match(html, /admin\/merchants\?merchant_id=123&amp;status=pending/);
assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
assert.doesNotMatch(html, /<script>/);
assert.throws(
  () => merchantNotificationEmailHtml({
    heading: "x", intro: "y", details: [], actionLabel: "x",
    actionUrl: "http://evil.example/admin", note: "x",
  }),
  /HTTPS/,
);

const route = fs.readFileSync("app/api/merchant-notifications/route.ts", "utf8");
assert.match(route, /adminUrl\.searchParams\.set\("merchant_id", merchant\.id\)/);
assert.match(route, /merchant_receipt_sent:/);
assert.match(route, /merchantEmail === contactEmail/);
assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(route, /Idempotency-Key/);

const login = fs.readFileSync("app/admin/login/page.tsx", "utf8");
const layout = fs.readFileSync("app/admin/layout.tsx", "utf8");
assert.match(login, /safeAdminReturnUrl/);
assert.match(login, /target\.startsWith\("\/admin\/"\)/);
assert.match(layout, /encodeURIComponent\(loginReturnTo\)/);
console.log("PASS: branded merchant mail HTML, escaping, HTTPS links, admin deep link, auth redirect and audit guards");
