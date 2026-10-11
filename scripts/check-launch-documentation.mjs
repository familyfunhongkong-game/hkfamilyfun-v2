import { readFile } from "node:fs/promises";

const runbook = await readFile("docs/CUTOVER_RUNBOOK.md", "utf8");
const checklist = await readFile(
  "docs/HK_FAMILY_FUN_LAUNCH_CHECKLIST.md",
  "utf8",
);

let failed = false;

function requireSignal(label, source, signal) {
  if (!source.includes(signal)) {
    console.error(`[launch-docs] ${label} missing: ${signal}`);
    failed = true;
  }
}

for (const signal of [
  "https://www.hkfamilyfun.com",
  "NEXT_PUBLIC_SITE_URL=https://www.hkfamilyfun.com",
  "NEXT_PUBLIC_API_URL=https://www.hkfamilyfun.com/api",
  "GOOGLE_ADMIN_DRIVE_REDIRECT_URI=https://www.hkfamilyfun.com/api/admin/google-drive/callback",
  "Production-writing E2E must remain manual-only",
  "canonical host is `www.hkfamilyfun.com`",
  "Keep the old destination available",
]) {
  requireSignal("cutover runbook", runbook, signal);
}

for (const signal of [
  "HISTORICAL PASS / MANUAL-ONLY NOW",
  "0 critical completeness blockers",
  "2 pending / 0 approved",
  "docs/CUTOVER_RUNBOOK.md",
  "Sell with Family Fun native ticketing remains safely disabled",
]) {
  requireSignal("launch checklist", checklist, signal);
}

const forbidden = [
  "canonical host is `hkfamilyfun.com`",
  "Merchant Auth E2E or Production Smoke is failing",
  "all four release gates are green",
  "workflow now runs on every `main` push",
  "legacy_migration=true",
];

for (const phrase of forbidden) {
  if (runbook.includes(phrase) || checklist.includes(phrase)) {
    console.error(`[launch-docs] stale/unsafe launch instruction remains: ${phrase}`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  "[launch-docs] OK — canonical www cutover, environment split, rollback path and manual-only mutable E2E policy are documented consistently.",
);
