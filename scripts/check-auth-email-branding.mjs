import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const paths = ["confirmation", "recovery"];
const logoUrl = "https://www.hkfamilyfun.com/api/brand/family-fun-logo";
const logoRoute = readFileSync("app/api/brand/family-fun-logo/route.ts", "utf8");
const middleware = readFileSync("proxy.ts", "utf8");
assert.match(logoRoute, /bf9f56f08f6a2cf522db388037e83c2d3363ebc5858400378efd6ead4ade9fa5/);
assert.match(logoRoute, /"image\/png"/);
assert.match(middleware, /const INTERNAL_PREFIXES = \[[^\]]*"\/api"/);
const parent = readFileSync("components/auth/parent-email-account.tsx", "utf8");
assert.ok(parent.includes('emailRedirectTo: window.location.origin + "/login"'), "Signup confirmation redirect changed");
assert.ok(parent.includes('redirectTo: window.location.origin + "/account/reset-password"'), "Parent recovery redirect changed");
assert.ok(parent.includes('type: "signup"'), "Resend confirmation flow must remain supported");
for (const type of paths) {
  const path = "supabase/templates/" + type + ".html";
  const html = readFileSync(path, "utf8");
  assert.ok(html.startsWith("<!doctype html>"), type + ": incomplete HTML document");
  assert.ok(html.includes('<html lang="zh-Hant">'), type + ": Hong Kong Traditional Chinese missing");
  assert.ok(html.includes('<table role="presentation"'), type + ": table-based branded email layout missing");
  assert.ok(html.includes('src="' + logoUrl + '"'), type + ": original logo URL missing");
  assert.ok(html.includes('alt="HK Family Fun Logo"'), type + ": image must have accessible alt text");
  assert.ok(html.includes("HK Family Fun") && html.includes("香港親子活動平台"), type + ": branded text fallback missing");
  assert.ok(html.includes('background-color:#6d28d9') && html.includes('color:#ffffff'), type + ": accessible CTA style missing");
  assert.equal((html.match(/href="\{\{ \.ConfirmationURL \}\}"/g) || []).length, 2, type + ": expected CTA and accessible fallback URL");
  assert.ok(!html.includes("http://"), type + ": insecure URL");
  assert.ok(html.includes("https://www.hkfamilyfun.com") && html.includes("mailto:info@hkfamilyfun.com"), type + ": footer contacts missing");
  assert.ok(!/<script|<form|onclick=/i.test(html), type + ": unsafe/unsupported interactive email");
  assert.ok(!/localhost|127\.0\.0\.1|staging\.vercel\.app/i.test(html), type + ": wrong site link");
  assert.ok(html.includes("這是帳戶安全通知，並非活動推廣電郵。"), type + ": account vs marketing should remain distinct");
}
const confirm=readFileSync("supabase/templates/confirmation.html","utf8");
const reset=readFileSync("supabase/templates/recovery.html","utf8");
assert.match(confirm,/確認電郵地址/);
assert.match(reset,/重設密碼/);
assert.match(reset,/如果你沒有要求重設密碼/);
console.log("[auth-email-branding] PASS: 2 full HTML original-logo templates, Supabase ConfirmationURL CTA and fallbacks, correct redirects, maintenance-safe logo route");
