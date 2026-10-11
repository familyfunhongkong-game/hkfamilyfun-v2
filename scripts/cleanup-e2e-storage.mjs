"use strict";

import { createClient } from "@supabase/supabase-js";

const url = "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const bucket = admin.storage.from("event-images");
  const root = await bucket.list("", { limit: 1000 });

  if (root.error) throw root.error;

  const removed = [];

  for (const entry of root.data || []) {
    const folder = entry.name;
    const listing = await bucket.list(folder, {
      search: "e2e-cover.png",
      limit: 100,
    });

    if (listing.error) {
      throw new Error(`Unable to inspect ${folder}: ${listing.error.message}`);
    }

    if ((listing.data || []).some((item) => item.name === "e2e-cover.png")) {
      const path = `${folder}/e2e-cover.png`;
      const deletion = await bucket.remove([path]);

      if (deletion.error) {
        throw new Error(`Unable to remove ${path}: ${deletion.error.message}`);
      }
      removed.push(path);
    }
  }

  console.log(JSON.stringify({ success: true, removed }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
