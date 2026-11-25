import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/admin/forgot-password/page.tsx", "utf8");
for (const required of [
  "resetPasswordForEmail(",
  '"/merchant/update-password"',
  "hkfamilyfun-staging.vercel.app",
  "NEXT_PUBLIC_SITE_URL",
  "setIsStaging(",
  "email_address_not_authorized",
  "error.status === 429",
  "如果尚未在 Staging Supabase Auth 建立管理員測試帳戶",
  "如這個環境已有對應的登入帳戶",
  "setIsSubmitting(false)",
]) {
  assert.ok(page.includes(required), "Admin password recovery missing: " + required);
}
assert.ok(
  !page.includes('/merchant/update-password?return=admin'),
  "Do not append query to redirectTo: strict allowlist can reject it",
);
assert.ok(
  !page.includes('window.location.origin + "/merchant/update-password"'),
  "Use stable canonical host for email redirects",
);
console.log("[admin-recovery] PASS: canonical URL, generic response, staging guidance, email errors");
