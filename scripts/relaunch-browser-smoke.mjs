// Anonymous, non-mutating release-gate browser checks. No private credentials.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const preview = process.env.PREVIEW_URL;
const expectedSha = process.env.EXPECTED_BUILD_SHA;
const production = "https://www.hkfamilyfun.com";
assert.ok(preview?.startsWith("https://"), "PREVIEW_URL must be HTTPS");
assert.match(expectedSha || "", /^[a-f0-9]{40}$/);
const outcomes = [];
const failures = [];
const fetchText = async (base, path) => {
  const r = await fetch(new URL(path, base), { redirect: "follow", signal: AbortSignal.timeout(25000) });
  return { status: r.status, body: await r.text(), url: r.url };
};
const health = await fetchText(preview, "/api/health");
assert.equal(health.status, 200, "Preview health must respond 200");
const h = JSON.parse(health.body);
assert.equal(h.ok, true, "Preview database must be healthy");
assert.equal(h.buildSha, expectedSha, "Preview must match EXACT workflow commit SHA");
assert.equal(h.service, "hkfamilyfun-v2");
outcomes.push({ check: "preview SHA + database", status: "PASS", buildSha: h.buildSha });

const prod = await fetchText(production, "/");
assert.equal(prod.status, 200, "Production maintenance homepage must respond 200");
assert.match(prod.body, /網站升級進行中|網站維護|Maintenance/i, "Production must stay in maintenance during QA");
const prodRobots = await fetchText(production, "/robots.txt");
assert.equal(prodRobots.status, 200);
assert.match(prodRobots.body, /Disallow:\s*\//i, "Maintenance robots must block crawlers");
outcomes.push({ check: "production maintenance + robots", status: "PASS" });
const previewRobots = await fetchText(preview, "/robots.txt");
assert.equal(previewRobots.status, 200);
const previewSitemap = await fetchText(preview, "/sitemap.xml");
assert.ok(previewSitemap.status < 500, "Preview sitemap must not error");
outcomes.push({ check: "preview robots + sitemap", status: "PASS", sitemapStatus: previewSitemap.status });

for (const [name, method, path, body] of [
  ["admin system anonymous", "GET", "/api/admin/system-health", null],
  ["import anonymous", "POST", "/api/import-event", '{"url":"https://example.com"}'],
  ["translate anonymous", "POST", "/api/translate-event", '{"event_id":"00000000-0000-0000-0000-000000000000","fields":{}}'],
  // This route only checks IDs and must never sign a private URL for unknown posts.

]) {
  const response = await fetch(new URL(path, preview), {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
  });
  if (response.status !== 401) failures.push(name + " returned HTTP " + response.status + " not 401");
  outcomes.push({ check: name, status: response.status === 401 ? "PASS" : "FAIL", http: response.status });
}


for (const suffix of ["", "&position=", "&position=foo", "&position=-1", "&position=4", "&position=0.0"]) {
  const path = "/api/community/photo?post=00000000-0000-4000-8000-000000000000" + suffix;
  const response = await fetch(new URL(path, preview), {redirect:"manual"});
  const valid = response.status === 400;
  outcomes.push({check:"reject malformed photo position " + (suffix || "missing"),status:valid?"PASS":"FAIL",http:response.status});
  if (!valid) failures.push("Malformed photo position must return HTTP 400: " + path + " got " + response.status);
}
const privatePhoto = await fetch(new URL("/api/community/photo?post=00000000-0000-4000-8000-000000000000&position=0",preview),{redirect:"manual"});
if(privatePhoto.status!==404)failures.push("Private photo route should 404 for unapproved/unknown post; got "+privatePhoto.status);
outcomes.push({check:"approved-only private photo",status:privatePhoto.status===404?"PASS":"FAIL",http:privatePhoto.status});
const photoList = await fetch(new URL("/api/community/photos?ids=00000000-0000-4000-8000-000000000000",preview));
const emptyBody = photoList.status===200 ? await photoList.json() : {};
const emptyList = photoList.status===200 && Object.keys(emptyBody.photos||{}).length===0 && Object.keys(emptyBody.likeCounts||{}).length===0;
if(!emptyList)failures.push("Unknown post photo metadata must stay empty");
outcomes.push({check:"unapproved photo metadata hidden",status:emptyList?"PASS":"FAIL",http:photoList.status,payload:emptyBody});

const browser = await chromium.launch({ headless: true });
try {
  const profiles = [
    { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 },
    { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false },
  ];
  const routes = ["/", "/events", "/today", "/calendar", "/events/map", "/tips", "/favorites", "/login", "/merchant/account", "/admin/login", "/admin/community", "/admin/community/replies", "/privacy", "/contact"];
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, deviceScaleFactor: profile.deviceScaleFactor || 1, locale: "zh-HK" });
    try {
      for (const path of routes) {
        const page = await context.newPage();
        const pageErrors = [];
        page.on("pageerror", (e) => pageErrors.push(e.message));
        try {
          const response = await page.goto(new URL(path, preview).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
          if(path.startsWith("/admin/community")) {
            await page.getByRole("alert").filter({hasText:"請先以管理員身份登入。"}).waitFor({state:"visible",timeout:12000}).catch(()=>{});
          } else {
            await page.waitForTimeout(500);
          }
          const rendered = await page.evaluate(() => ({
            text: document.body?.innerText || "",
            width: document.documentElement.scrollWidth,
            viewport: window.innerWidth,
            metaRobots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
          }));
          const status = response?.status() || 0;
          const problems = [];
          if (status >= 400 || status === 0) problems.push("HTTP " + status);
          if (!rendered.text.trim()) problems.push("empty screen");
          if (/網站升級進行中|This deployment is protected|Authentication Required/i.test(rendered.text)) problems.push("preview blocked by maintenance/protection");
          if (rendered.width > rendered.viewport + 8) problems.push("horizontal overflow " + rendered.width + " > " + rendered.viewport);
          if (path === "/" && !/noindex/i.test(rendered.metaRobots)) problems.push("preview missing noindex");
          if (path === "/admin/login" && !/管理員登入|Admin Login/i.test(rendered.text)) problems.push("admin login form missing");
          if (path === "/login" && !/登入|Login|Sign in/i.test(rendered.text)) problems.push("member login form missing");
          if (path === "/tips" && !/報料|社區|Tips/i.test(rendered.text)) problems.push("community page missing");
          if (path.startsWith("/admin/community") && !rendered.text.includes("請先以管理員身份登入。")) problems.push("unauthorized moderation UI not blocked");
          if (pageErrors.length) problems.push("browser errors: " + pageErrors.slice(0, 2).join(" | "));
          const check = profile.name + " " + path;
          outcomes.push({ check, status: problems.length ? "FAIL" : "PASS", http: status, overflow: rendered.width - rendered.viewport, problems });
          if (problems.length) failures.push(check + ": " + problems.join("; "));
        } catch (e) {
          failures.push(profile.name + " " + path + ": " + e.message);
          outcomes.push({ check: profile.name + " " + path, status: "FAIL", error: e.message });
        } finally {
          await page.close();
        }
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
for (const item of outcomes) console.log(JSON.stringify(item));
const passed = outcomes.filter((item) => item.status === "PASS").length;
const failed = outcomes.filter((item) => item.status === "FAIL").length;
console.log(`Release browser QA: ${passed}/${outcomes.length} checks PASS; ${failed} checks FAIL; ${failures.length} failure messages`);
if (failures.length) {
  console.error("Release browser QA failures:\n" + failures.join("\n"));
  process.exitCode = 1;
}
