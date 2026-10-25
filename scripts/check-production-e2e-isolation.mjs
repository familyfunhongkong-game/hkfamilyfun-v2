import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

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

// Fail-closed staging E2E: no credentials for live Supabase may enter this script.
for (const key of [
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_PUBLISHABLE_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_SITE_URL",
]) {
  if (!workflow.includes("secrets." + key) || !script.includes("process.env." + key)) {
    fail("staging-only E2E configuration missing: " + key);
  }
}
if (!/^\s+environment:\s*staging\s*$/m.test(workflow)) {
  fail("mutable Merchant Auth E2E must require the staging GitHub Environment");
}
if (workflow.includes("secrets.SUPABASE_SERVICE_ROLE_KEY")) {
  fail("manual workflow must never inherit the live service-role secret");
}
if (!script.includes("stagingProjectRef === PROD_PROJECT_REF")) {
  fail("E2E script must explicitly reject the live Supabase project");
}

function expectRefusal(name, env, errorPattern) {
  const run = spawnSync(process.execPath, ["scripts/merchant-auth-e2e.mjs"], {
    encoding: "utf8",
    timeout: 10000,
    env: {
      ...process.env,
      E2E_SUPABASE_URL: env.E2E_SUPABASE_URL || "",
      E2E_SUPABASE_PUBLISHABLE_KEY: "test-not-real",
      E2E_SUPABASE_SERVICE_ROLE_KEY: "test-not-real",
      E2E_SITE_URL: env.E2E_SITE_URL || "",
      REQUIRE_NOTIFICATION: "false",
    },
  });
  if (run.status === 0 || !errorPattern.test(run.stderr || "")) {
    fail("staging safety must refuse " + name);
  }
}
expectRefusal("missing configuration", {}, /Isolated E2E staging configuration is missing/);
expectRefusal("live Supabase project", {
  E2E_SUPABASE_URL: "https://uiyrbqqvgnfhfdhedmav.supabase.co",
  E2E_SITE_URL: "https://staging-example.vercel.app",
}, /E2E refused: use an independent HTTPS Supabase staging project/);
expectRefusal("production website", {
  E2E_SUPABASE_URL: "https://test-project.supabase.co",
  E2E_SITE_URL: "https://hkfamilyfun.com",
}, /E2E refused: site URL must point to a dedicated staging deployment/);

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
