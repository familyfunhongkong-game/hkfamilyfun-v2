import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const client = await readFile("lib/supabase/public-client.ts", "utf8");
for (const required of ["persistSession: false", "autoRefreshToken: false", "detectSessionInUrl: false", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
  assert.ok(client.includes(required), `public client missing safeguard: ${required}`);
}
assert.ok(!client.includes("SUPABASE_SERVICE_KEY"), "Never use service keys in a public browser client");
const publicReaders = [
  "lib/supabase/events.ts",
  "lib/events/public-event-records.ts",
  "app/events/[id]/page.tsx",
  "app/favorites/page.tsx",
  "components/events/PublicEventsSearchClient.tsx",
];
for (const path of publicReaders) {
  const source = await readFile(path, "utf8");
  assert.ok(source.includes('import { publicSupabase as supabase } from "@/lib/supabase/public-client";'), `${path} must use the separate public client`);
  assert.ok(!source.includes('import { supabase } from "@/lib/supabase/client";'), `${path} cannot inherit a signed-in session for public reads`);
  assert.ok(source.includes('"public_events_i18n"'), `${path} cannot read the raw events table`);
}
const merchant = await readFile("app/merchant/events/[id]/edit/page.tsx", "utf8");
const admin = await readFile("app/admin/events/page.tsx", "utf8");
assert.ok(merchant.includes('import { supabase } from "@/lib/supabase/client";'));
assert.ok(admin.includes('import { supabase } from "@/lib/supabase/client";'));
console.log("[public-event-auth-isolation] PASS: public catalogue isolated; admin/merchant retain authenticated client.");
