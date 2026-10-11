import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/merchant-auth-e2e.yml", "utf8");
const script = await readFile("scripts/merchant-auth-e2e.mjs", "utf8");

let failed = false;

function fail(message) {
  console.error("[production-e2e-isolation] " + message);
  failed = true;
}

if (/^\s*push\s*:/m.test(workflow)) {
  fail("mutable Merchant Auth E2E must not run automatically on push against production Supabase");
}

if (!/^\s*workflow_dispatch\s*:/m.test(workflow)) {
  fail("Merchant Auth E2E must remain available as an explicit manual workflow");
}

for (const signal of [
  'admin.from("platform_notifications").delete().eq("event_id", eventId)',
  'admin.from("platform_notifications").delete().eq("merchant_id", merchantId)',
  'admin.from("events").delete().eq("id", eventId)',
  'admin.from("merchants").delete().eq("id", merchantId)',
  'admin.auth.admin.deleteUser(userId)',
  'if (deletedEvent) eventId = ""',
  'if (deletedMerchant) merchantId = ""',
  'if (deletedUser) userId = ""',
]) {
  if (!script.includes(signal)) {
    fail("cleanup contract missing: " + signal);
  }
}

const notificationDelete = script.indexOf(
  'admin.from("platform_notifications").delete().eq("event_id", eventId)',
);
const eventDelete = script.indexOf('admin.from("events").delete().eq("id", eventId)');
if (notificationDelete < 0 || eventDelete < 0 || notificationDelete > eventDelete) {
  fail("event notifications must be deleted before the test event");
}

if (failed) process.exit(1);

console.log(
  "[production-e2e-isolation] OK — mutable Merchant Auth E2E is manual-only and cleanup is ordered/idempotent.",
);
