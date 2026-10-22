import assert from "node:assert/strict";

const origin = process.env.COOKIE_SMOKE_ORIGIN || "https://www.hkfamilyfun.com";
const endpoint = new URL("/api/privacy/cookie-choice", origin);
const settings = new URL("/cookies", origin);
if (origin !== "https://www.hkfamilyfun.com") throw Error("Unexpected production host");

const cases = [
  { choice: "essential", expected: "v1_essential" },
  { choice: "analytics", expected: "v1_analytics" },
  { choice: "custom", extra: "analytics=yes", expected: "v1_analytics" },
  { choice: "custom", expected: "v1_essential" },
];

async function postCase({ choice, extra, expected }) {
  const body = new URLSearchParams({ choice });
  if (extra) body.set("analytics", "yes");
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const location = response.headers.get("location") || "";
  const cookie = response.headers.get("set-cookie") || "";
  console.log(`[live-cookie] ${choice}/${extra ?? "none"}: HTTP ${response.status}; redirect=${new URL(location || settings.href, origin).pathname}; set-cookie=${cookie.includes("hkff_cookie_preferences=")}`);
  assert.equal(response.status, 303, `POST consent must return 303, got ${response.status}`);
  assert.equal(new URL(location, origin).pathname, "/cookies", "redirect must stay on cookie settings page");
  assert.match(cookie, new RegExp(`hkff_cookie_preferences=${expected}(?:;|$)`));
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Secure/i);

  const check = await fetch(settings, {
    headers: { Cookie: `hkff_cookie_preferences=${expected}; hkff_locale=zh-Hant` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const page = await check.text();
  assert.equal(check.status, 200, "Cookie policy must be accessible during maintenance");
  assert.ok(page.includes(expected === "v1_analytics" ? "目前選擇：已允許流量分析" : "目前選擇：只使用必要 Cookies"), "GET must reflect saved cookie on page");
}

for (const item of cases) await postCase(item);

const rejected = await fetch(endpoint, {
  method: "POST",
  redirect: "manual",
  headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site", "Content-Type": "application/x-www-form-urlencoded" },
  body: "choice=analytics",
  signal: AbortSignal.timeout(20000),
});
assert.equal(rejected.status, 403, "Cross-site permission changes must fail");
console.log("[live-cookie] PASS — 4 real POSTs set cookie + redirects, server GET reflects saved consent, cross-site rejected");
