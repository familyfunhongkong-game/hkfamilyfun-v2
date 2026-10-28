import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/api/cron/archive-expired-events/route.ts", "utf8");

assert.match(source, /export async function GET\(request: NextRequest\)/);
assert.ok(source.includes('authorization !== "Bearer " + cronSecret'), "Cron auth must be preserved");
assert.ok(source.includes('if (!cronSecret'), "A missing cron secret must reject requests");
assert.ok(source.includes('status: 401'), "Unauthenticated requests must be denied");
assert.ok(source.includes('policy: "smart-expiry-read-only"'), "Read-only smart expiry policy must be declared");
assert.ok(source.includes("archived_count: 0"), "No activity may be auto-archived");
assert.ok(!source.includes(".update("), "Cron may not update the activity database");
assert.ok(!source.includes(".delete("), "Cron may not delete activity data");
assert.ok(!source.includes(".insert("), "Cron may not insert activity data");
assert.ok(!source.includes("serviceClient("), "Cron must not construct privileged Supabase client");
assert.ok(!source.includes("status: \"archived\""), "Cron may not force editorial status");

console.log("[expiry-cron-safety] PASS — authenticated, read-only, zero status mutations.");
