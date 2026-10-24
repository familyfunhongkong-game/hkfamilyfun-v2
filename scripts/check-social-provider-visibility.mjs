import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
for (const path of ["components/merchant/merchant-login-panel.tsx", "components/merchant/merchant-register-panel.tsx"]) {
  const s = readFileSync(path,"utf8");
  assert.ok(s.includes('socialSignInAvailability("google")'), "Google auth must be checked");
  assert.ok(s.includes('socialSignInAvailability("facebook")'), "Facebook auth must be checked");
  assert.ok(s.includes('availableSocial.google && <button'), "Disabled Google button must not display");
  assert.ok(s.includes('availableSocial.facebook && <button'), "Disabled Facebook button must not display");
  assert.ok(s.includes("(availableSocial.google || availableSocial.facebook) && ("), "Hide social separator when providers unavailable");
  assert.ok(!s.includes("登入尚未啟用") && !s.includes("未能核實 ${label} 登入設定"), "Public cannot see provider configuration details");
  assert.ok(s.includes("signInWithPassword(") || s.includes("auth.signUp("), "Email method always stays available");
}
console.log("[social-providers] PASS — unavailable provider hidden, email fallback preserved");
