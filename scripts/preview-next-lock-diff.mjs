import fs from "node:fs";
import { execFileSync } from "node:child_process";

// One-time Preview build diagnostic: regenerate the lockfile with npm's official
// resolution engine and emit a compact key-level diff without tokens or secrets.
const before = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
execFileSync("npm", [
  "install", "next@16.4.2", "--save-exact", "--package-lock-only",
  "--ignore-scripts", "--no-audit", "--no-fund",
], { stdio: "inherit", timeout: 120000 });
const after = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const beforeEntries = before.packages || {};
const afterEntries = after.packages || {};
const patch = Object.keys({ ...beforeEntries, ...afterEntries })
  .filter((key) => JSON.stringify(beforeEntries[key]) !== JSON.stringify(afterEntries[key]))
  .map((key) => ({ key, entry: afterEntries[key] ?? null }));
const output = JSON.stringify({ version: "16.4.2", changes: patch });
console.log(`LOCKDIFF_ITEMS=${patch.length};BYTES=${output.length}`);
for (let i = 0; i < output.length; i += 900) {
  console.log(`LOCKDIFF_PART_${Math.floor(i / 900)}=${output.slice(i, i + 900)}`);
}
