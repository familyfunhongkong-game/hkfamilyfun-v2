import { readFile } from "node:fs/promises";

const smoke = await readFile(".github/workflows/production-smoke.yml", "utf8");

const requiredSignals = [
  '"/merchant/advertising"',
  '"/admin/advertising"',
  '"$BASE/api/merchant-advertising-enquiry"',
  'test "$advertising_code" = "401"',
  '"$BASE/api/cron/archive-expired-events"',
  'test "$cron_code" = "401"',
  '[merchant-advertising]="/merchant/advertising"',
  'staging-noindex',
  'production-index',
  'Check protected APIs reject anonymous writes',
  'Capture mobile and desktop visual regression screenshots',
];

let failed = false;

for (const signal of requiredSignals) {
  if (!smoke.includes(signal)) {
    console.error(`[production-smoke] missing required coverage: ${signal}`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  "[production-smoke] OK — public, auth, advertising, SEO and visual release coverage retained.",
);
