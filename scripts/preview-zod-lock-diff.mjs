import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Temporary PREVIEW-only security upgrade preparation. npm's own resolver produces
// a deterministic lock patch; NEVER run a schema migration or production write.
const before = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
execFileSync("npm", ["install", "zod@4.6.7", "--save-exact", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
  stdio: "inherit",
  timeout: 120000,
});
const after = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const entries = Object.keys({ ...before.packages, ...after.packages })
  .filter(key => JSON.stringify(before.packages[key]) !== JSON.stringify(after.packages[key]))
  .map(key => ({ key, entry: after.packages[key] ?? null }));
const out = JSON.stringify({ version: "4.6.7", changes: entries });
console.log(`LOCKDIFF_ITEMS=${entries.length};BYTES=${out.length}`);
for (let i = 0; i < out.length; i += 900) {
  console.log(`LOCKDIFF_PART_${Math.floor(i/900)}=${out.slice(i,i+900)}`);
}
