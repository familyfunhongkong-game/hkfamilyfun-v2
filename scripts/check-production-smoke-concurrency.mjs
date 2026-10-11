import { readFile } from "node:fs/promises";

const smoke = await readFile(".github/workflows/production-smoke.yml", "utf8");

let failed = false;

for (const signal of [
  "group: hkfamilyfun-production-smoke",
  "cancel-in-progress: false",
  'current_main_sha="$(resolve_main_sha)"',
  'if [[ -n "$current_main_sha" && "$expected_sha" != "$current_main_sha" ]]',
  'echo "should_test=false"',
  "Capture mobile and desktop visual regression screenshots",
  "Validate screenshot PNG integrity",
  'signature !== "89504e470d0a1a0a"',
  "buffer.readUInt32BE(16)",
  "buffer.length < 15000",
]) {
  if (!smoke.includes(signal)) {
    console.error(`[production-smoke] missing safety signal: ${signal}`);
    failed = true;
  }
}

if (smoke.includes("cancel-in-progress: true")) {
  console.error(
    "[production-smoke] duplicate workflow runs must not cancel a valid smoke mid-regression",
  );
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[production-smoke] OK — duplicate runs cannot cancel valid QA; stale commits self-skip via latest-main gate.",
);
