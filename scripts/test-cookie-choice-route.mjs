import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("app/api/privacy/cookie-choice/route.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const response = (status, url = null) => {
  const cookies = [];
  const headers = new Map();
  return { status, url, cookies: { set: (...args) => cookies.push(args), written: cookies }, headers };
};
const next = {
  NextResponse: {
    json: (_body, init) => response(init.status),
    redirect: (url, init) => response(init.status, url.href),
  },
};
const runtime = { exports: {} };
runInNewContext(js, {
  exports: runtime.exports,
  module: runtime,
  URL,
  require(id) {
    if (id === "next/server") return next;
    if (id === "@/lib/privacy/cookie-consent") return {
      CONSENT_COOKIE: "hkff_cookie_preferences",
      ANALYTICS_CONSENT: "v1_analytics",
      ESSENTIAL_CONSENT: "v1_essential",
    };
    throw Error("Unexpected dependency: " + id);
  },
}, { timeout: 3000 });
const { POST } = runtime.exports;
function request(choice, analytics = false, origin = "https://www.hkfamilyfun.com", fetchSite = "same-origin") {
  const fields = new Map([["choice", choice]]);
  if (analytics) fields.set("analytics", "yes");
  return {
    url: "https://www.hkfamilyfun.com/api/privacy/cookie-choice",
    nextUrl: { origin: "https://www.hkfamilyfun.com", protocol: "https:" },
    headers: { get(name) { return name === "origin" ? origin : name === "sec-fetch-site" ? fetchSite : null; } },
    async formData() { return { get(name) { return fields.get(name) ?? null; } }; },
  };
}
for (const [choice, analytics, expected] of [
  ["essential", true, "v1_essential"],
  ["analytics", false, "v1_analytics"],
  ["custom", true, "v1_analytics"],
  ["custom", false, "v1_essential"],
]) {
  const output = await POST(request(choice, analytics));
  assert.equal(output.status, 303);
  assert.equal(output.url, `https://www.hkfamilyfun.com/cookies?saved=${expected === "v1_analytics" ? "analytics" : "essential"}#cookie-settings`);
  assert.equal(output.cookies.written.length, 1);
  const [name, value, options] = output.cookies.written[0];
  assert.equal(name, "hkff_cookie_preferences");
  assert.equal(value, expected);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.secure, true);
  assert.equal(options.path, "/");
  assert.equal(options.httpOnly, false);
}
assert.equal((await POST(request("invalid"))).status, 400);
assert.equal((await POST(request("analytics", false, "https://evil.example", "cross-site"))).status, 403);
assert.equal((await POST(request("analytics", false, null, "cross-site"))).status, 403);
assert.equal((await POST(request("analytics", false, null, "same-origin"))).status, 303);
console.log("[cookie-choice] PASS — native POST accepts/rejects/customizes consent, sets secure cookie, rejects cross-site requests");
