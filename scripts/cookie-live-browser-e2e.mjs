import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = "https://www.hkfamilyfun.com";
const out = "artifacts/cookie-browser-e2e";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function newContext(locale, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.width < 600 ? 2 : 1,
    reducedMotion: "reduce",
    locale: locale === "en" ? "en-US" : "zh-HK",
  });
  await context.addCookies([{
    name: "hkff_locale",
    value: locale,
    url: BASE,
    sameSite: "Lax",
  }]);
  return context;
}

async function currentState(page) {
  return page.evaluate(() => ({
    preferences: document.cookie.split(";").map(s => s.trim()).find(s => s.startsWith("hkff_cookie_preferences=")) || null,
    visitor: localStorage.getItem("hkff_visitor_id"),
    session: sessionStorage.getItem("hkff_session_id"),
  }));
}

async function checkDesktop() {
  const context = await newContext("en", { width: 1280, height: 800 });
  const page = await context.newPage();
  const requests = [];
  page.on("request", req => {
    if (req.url().includes("/api/analytics/track")) requests.push(req);
  });

  try {
    await page.goto(BASE + "/cookies", { waitUntil: "domcontentloaded" });
    const reject = page.getByRole("button", { name: "Reject all" });
    await reject.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(1300);
    const before = await currentState(page);
    assert.equal(before.preferences, null, "No preference cookie before first consent");
    assert.equal(before.visitor, null, "No visitor ID before consent");
    assert.equal(before.session, null, "No session ID before consent");
    assert.equal(requests.length, 0, "Never track visitors before opt-in");

    await reject.click();
    await page.waitForTimeout(500);
    let after = await currentState(page);
    assert.ok(after.preferences.includes("v1_essential"), "Reject all must persist essential-only preference");
    assert.equal(after.visitor, null, "Reject must not create visitor identifier");
    assert.equal(after.session, null, "Reject must not create session identifier");
    assert.equal(requests.length, 0, "Reject must never send analytics");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    assert.equal(await page.getByRole("button", { name: "Reject all" }).count(), 0, "Banner should stay dismissed on reload");
    assert.equal(requests.length, 0, "Rejected visitor must not be tracked on reload");

    await page.getByRole("button", { name: "Cookie settings" }).click();
    const analyticsBox = page.getByRole("checkbox", { name: "Analytics (optional)" });
    await analyticsBox.waitFor();
    assert.equal(await analyticsBox.isChecked(), false, "Rejected consent must reopen unchecked");

    const responsePromise = page.waitForResponse(
      r => r.url().includes("/api/analytics/track") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByRole("button", { name: "Accept all" }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 204, "Consented analytics API must return 204");
    after = await currentState(page);
    assert.ok(after.preferences.includes("v1_analytics"), "Accept all must persist consent");
    assert.ok(after.visitor && after.session, "Opt-in must generate both analytics identifiers");

    console.log(JSON.stringify({ phase: "desktop", preconsentRequests: 0, rejectRequests: 0, acceptResponse: response.status(), consent: "v1_analytics", browser: "chromium" }));
  } finally {
    await page.screenshot({ path: out + "/desktop-final.png", fullPage: true }).catch(() => {});
    await context.close();
  }
}

async function checkMobile() {
  const context = await newContext("zh-Hant", { width: 390, height: 844 });
  const page = await context.newPage();
  const requests = [];
  page.on("request", req => {
    if (req.url().includes("/api/analytics/track")) requests.push(req);
  });

  try {
    await page.goto(BASE + "/cookies", { waitUntil: "domcontentloaded" });
    const reject = page.getByRole("button", { name: "全部拒絕" });
    const accept = page.getByRole("button", { name: "全部接受" });
    const manage = page.getByRole("button", { name: "管理設定" });
    await reject.waitFor({ state: "visible", timeout: 15000 });
    assert.equal(await accept.isVisible(), true);
    assert.equal(await manage.isVisible(), true);

    const rejectBounds = await reject.boundingBox();
    const acceptBounds = await accept.boundingBox();
    const manageBounds = await manage.boundingBox();
    assert.ok(rejectBounds && acceptBounds && manageBounds, "Mobile button bounds missing");
    assert.ok(Math.abs(rejectBounds.y - acceptBounds.y) < 8, "Reject and accept should share row");
    assert.ok(manageBounds.y > rejectBounds.y, "Manage settings must use a separate mobile row");

    await page.screenshot({ path: out + "/mobile-first-visit.png", fullPage: false });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(450);
    const footerOverlap = await page.evaluate(() => {
      const foot = document.querySelector("footer");
      const bar = document.querySelector('section[aria-label="你的 Cookies 選擇"]');
      if (!foot || !bar) return null;
      return { footerBottom: foot.getBoundingClientRect().bottom, bannerTop: bar.getBoundingClientRect().top, viewport: innerHeight };
    });
    assert.ok(footerOverlap, "Footer or Cookie banner not found");
    assert.ok(footerOverlap.footerBottom <= footerOverlap.bannerTop + 8, "Fixed banner must not hide Footer at bottom scroll");
    await page.screenshot({ path: out + "/mobile-footer-visible.png", fullPage: false });

    await manage.click();
    const box = page.getByRole("checkbox", { name: "流量分析（可選）" });
    await box.waitFor();
    assert.equal(await box.isChecked(), false, "Mobile analytics must not be prechecked");
    await box.check();

    const responsePromise = page.waitForResponse(
      r => r.url().includes("/api/analytics/track") && r.request().method() === "POST",
      { timeout: 20000 }
    );
    await page.getByRole("button", { name: "儲存選擇" }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 204);
    let state = await currentState(page);
    assert.ok(state.preferences.includes("v1_analytics"));
    assert.ok(state.visitor && state.session);

    await page.getByRole("button", { name: "Cookies 設定" }).click();
    await box.waitFor();
    assert.equal(await box.isChecked(), true, "Manage must reflect previous consent");
    await box.uncheck();
    await page.getByRole("button", { name: "儲存選擇" }).click();
    state = await currentState(page);
    assert.ok(state.preferences.includes("v1_essential"), "Withdrawal must save rejection");
    assert.equal(state.visitor, null, "Withdraw should remove visitor identifier");
    assert.equal(state.session, null, "Withdraw should remove session identifier");

    const requestsAtWithdrawal = requests.length;
    await page.goto(BASE + "/privacy", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    assert.equal(requests.length, requestsAtWithdrawal, "After withdrawal further page navigation must not track");

    console.log(JSON.stringify({ phase: "mobile", width: 390, footerOverlap, acceptedResponse: response.status(), withdrawal: "v1_essential", subsequentTracking: 0, browser: "chromium" }));
  } finally {
    await page.screenshot({ path: out + "/mobile-final.png", fullPage: false }).catch(() => {});
    await context.close();
  }
}

try {
  await checkDesktop();
  await checkMobile();
  console.log("[cookie-live-e2e] PASS: real Chromium opt-in, reject, mobile footer scroll and withdrawal");
} finally {
  await browser.close();
}
