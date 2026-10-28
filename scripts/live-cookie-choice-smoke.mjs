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

// A user reporting unclickable Cookie settings must also have a real footer link
// and controls without disabled attributes on the canonical live domain.
const merchantPage = await fetch(new URL("/merchant/login", origin), {
  signal: AbortSignal.timeout(20000),
});
assert.equal(merchantPage.status, 200, "Merchant login must be accessible");
const merchantHtml = await merchantPage.text();
assert.ok(merchantHtml.includes('href="/cookies#cookie-settings"'), "Merchant login footer must link to actual cookie settings");

const cookiePage = await fetch(settings, { signal: AbortSignal.timeout(20000) });
assert.equal(cookiePage.status, 200, "Cookie settings must be accessible");
const cookieHtml = await cookiePage.text();
const start = cookieHtml.indexOf('id="cookie-settings"');
assert.ok(start >= 0, "Cookie settings must render");
const end = cookieHtml.indexOf("</section>", start);
const settingsMarkup = cookieHtml.slice(start, end > start ? end : start + 8000);
assert.ok(settingsMarkup.includes('method="POST"'), "Cookie settings must use a native form");
assert.ok(settingsMarkup.includes('action="/api/privacy/cookie-choice"'), "Cookie form must use the real endpoint");
assert.ok(settingsMarkup.includes('value="essential"') && settingsMarkup.includes('value="analytics"'), "Cookie choice buttons missing");
assert.ok(!settingsMarkup.includes('disabled=""') && !settingsMarkup.includes('disabled '), "Cookie controls must not be disabled in initial HTML");
console.log("[live-cookie] PUBLIC UI PASS — merchant footer links to enabled cookie form");

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
