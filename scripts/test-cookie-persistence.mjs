import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/privacy/cookie-consent.ts", "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function runtime({ writable, storageWritable = true }) {
  let cookie = "";
  const removed = [];
  const storage = new Map();
  const document = {
    get cookie() { return cookie; },
    set cookie(next) { if (writable) cookie = next.split(";")[0]; },
  };
  const window = {
    location: { protocol: "https:" },
    localStorage: {
      removeItem: (key) => { removed.push(key); storage.delete(key); },
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { if (!storageWritable) throw new Error("blocked"); storage.set(key, value); },
    },
    sessionStorage: { removeItem: (key) => removed.push(key) },
    dispatchEvent: () => {},
  };
  const module = { exports: {} };
  runInNewContext(javascript, {
    module,
    exports: module.exports,
    document,
    window,
    Event: class Event {},
  }, { timeout: 3000 });
  return { ...module.exports, removed, storage };
}

const allowed = runtime({ writable: true });
allowed.saveConsent("analytics");
assert.equal(allowed.readConsent(), "analytics");
allowed.saveConsent("essential");
assert.equal(allowed.readConsent(), "essential");
assert.ok(allowed.removed.includes("hkff_visitor_id"), "Revoking analytics clears persistent ID");
assert.ok(allowed.removed.includes("hkff_session_id"), "Revoking analytics clears session ID");

const denied = runtime({ writable: false });
assert.equal(denied.readConsent(), null);
assert.throws(() => denied.saveConsent("analytics"), /Browser did not store/);
denied.saveConsent("essential");
assert.equal(denied.readConsent(), "essential", "Essential-only persists in privacy-safe local fallback");
assert.equal(denied.storage.get("hkff_cookie_essential_backup"), "v1_essential");
assert.ok(denied.removed.includes("hkff_visitor_id"), "Analytics IDs must still be removed when cookie write fails");
const blockedAll = runtime({ writable: false, storageWritable: false });
assert.throws(() => blockedAll.saveConsent("essential"), /Browser did not store/);
assert.equal(blockedAll.readConsent(), null, "Blocked both cookie and local storage never pretends success");

console.log("[cookie-persistence] PASS — cookie verification, essential-only fallback, analytics blocked, all storage denied");
