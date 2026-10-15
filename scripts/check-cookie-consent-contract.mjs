import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const preference = read("lib/privacy/cookie-consent.ts");
const banner = read("components/cookie-preferences.tsx");
const tracker = read("components/site-analytics-tracker.tsx");
const endpoint = read("app/api/analytics/track/route.ts");
const layout = read("app/layout.tsx");
const proxy = read("proxy.ts");
const policy = read("app/cookies/page.tsx");

assert.match(preference, /CONSENT_COOKIE = "hkff_cookie_preferences"/);
assert.match(preference, /ANALYTICS_CONSENT = "v1_analytics"/);
assert.match(preference, /ESSENTIAL_CONSENT = "v1_essential"/);
assert.match(preference, /clearAnalyticsIdentifiers\(\)/);
assert.match(preference, /localStorage.removeItem\("hkff_visitor_id"\)/);
assert.match(preference, /sessionStorage.removeItem\("hkff_session_id"\)/);
assert.match(banner, /apply\("essential"\)/, "Visitors must be able to refuse analytics");
assert.match(banner, /apply\("analytics"\)/, "Visitors must be able to opt in");
assert.match(banner, /"hkff:open-cookie-settings"/, "Footer must reopen preferences");
assert.match(banner, /max-w-6xl/, "Cookie banner should have a wide, low-profile desktop layout");
assert.match(banner, /grid-cols-3/, "Accept, reject and settings should be visible in the same layer");
assert.match(banner, /grid-cols-2 gap-2 sm:grid-cols-3/, "Small mobile screens need a two-column control layout");
assert.match(banner, /col-span-2 sm:col-span-1/, "Manage settings must remain readable on narrow screens");
assert.match(banner, /new ResizeObserver\(updateSpace\)/, "Footer must remain scrollable when banner grows");
assert.match(banner, /body.style.paddingBottom = /, "Banner must reserve footer scroll space");
assert.match(banner, /body.style.paddingBottom = originalInlinePadding/, "Footer spacing must be restored after closing");

assert.match(banner, /choiceButton/, "Accept and reject should have equal visual emphasis");
assert.match(banner, /onClick=\{\(\) => apply\("essential"\)\} className=\{choiceButton\}/);
assert.match(banner, /onClick=\{\(\) => apply\("analytics"\)\} className=\{choiceButton\}/);
assert.match(banner, /setAnalytics\(stored === "analytics"\)/, "Optional analytics must not be preselected without prior consent");
assert.match(banner, /setAnalytics\(previous === "analytics"\)/, "Reopening settings should respect saved choice");
assert.match(banner, /setCustomizing\(true\)/, "Users should be able to customize choices");
assert.match(banner, /aria-label=\{c.analytics\}/, "Customizable analytics need an accessible label");

assert.match(tracker, /readConsent\(\) !== "analytics"/, "Tracker must not run without opt-in");
assert.match(tracker, /pagePath = pathname;/, "Do not send private search-query details");
assert.match(tracker, /CONSENT_EVENT/, "Tracker must handle consent changes");
assert.match(endpoint, /request.cookies.get\(CONSENT_COOKIE\)\?\.value !== ANALYTICS_CONSENT/, "The server must also require consent");
assert.match(endpoint, /body.pagePath.includes\("\?"\)/, "Server must reject querystrings");
assert.match(layout, /<CookiePreferences locale=\{locale\}/);
assert.match(layout, /<CookieSettingsButton locale=\{locale\}/);
assert.match(layout, /href="\/cookies"/);
assert.match(proxy, /"\/cookies"/);
for (const locale of ['"zh-Hant"', '"zh-Hans"', '"en"']) {
  assert.ok(policy.includes(locale), `Missing cookie policy for ${locale}`);
}
console.log("[cookie-consent] PASS: opt-in analytics, revocation, server gate, privacy policy and footer controls");
