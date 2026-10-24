import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveApprovalRecipient } from "./approval-recipient.mjs";

const delivered = "admin@example.com";
let lookedUp = 0;
assert.equal(await resolveApprovalRecipient("  admin@example.com  ", async () => {
  lookedUp++;
  return [];
}), delivered);
assert.equal(lookedUp, 0, "Valid explicitly configured recipients must not require database lookup");

for (const bounced of ["info@hkfamilyfun.com", " INFO@HKFAMILYFUN.COM ", ""]) {
  assert.equal(await resolveApprovalRecipient(bounced, async () => [delivered]), delivered);
}
await assert.rejects(
  () => resolveApprovalRecipient("info@hkfamilyfun.com", async () => []),
  /Exactly one active Super Admin recipient/,
);
await assert.rejects(
  () => resolveApprovalRecipient("info@hkfamilyfun.com", async () => [delivered, "other@example.com"]),
  /Exactly one active Super Admin recipient/,
);
await assert.rejects(
  () => resolveApprovalRecipient("info@hkfamilyfun.com", async () => ["info@hkfamilyfun.com"]),
  /Exactly one active Super Admin recipient/,
);
await assert.rejects(
  () => resolveApprovalRecipient("not-an-email", async () => [delivered]),
  /invalid/,
);
await assert.rejects(
  () => resolveApprovalRecipient("info@hkfamilyfun.com", async () => {throw Error("DB unavailable");}),
  /DB unavailable/,
);
assert.equal(
  await resolveApprovalRecipient("info@hkfamilyfun.com", async () => [delivered, delivered.toUpperCase()]),
  delivered,
  "Duplicate case variations should not create duplicate sends",
);

const discovery = readFileSync("scripts/auto-discover-events.mjs", "utf8");
assert.ok(discovery.includes('import { resolveApprovalRecipient } from "./approval-recipient.mjs"'));
assert.ok(discovery.includes('.from("admin_users")') && discovery.includes('.eq("role", "super_admin")'));
assert.ok(discovery.includes('.eq("status", "active")'), "Inactive Admins cannot receive signed approval links");
assert.ok(discovery.includes("to: [approvalRecipient]"), "No unverified inbox may be used for signed review links");
assert.ok(!discovery.includes("to: [APPROVAL_EMAIL]"), "Raw bouncing operational inbox must not receive review links");
console.log("[approval-recipient] PASS — verified fallback, disabled mailbox, active-role constraints, fail-closed behavior");
