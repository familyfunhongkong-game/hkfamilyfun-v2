"use strict";

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(event) {
  const queries = [
    [event.venue_name, "Hong Kong"].filter(Boolean).join(" "),
    [event.address, "Hong Kong"].filter(Boolean).join(" "),
    [event.venue_name, event.address].filter(Boolean).join(" "),
    event.venue_name || "",
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  for (const query of [...new Set(queries)]) {
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=hk&accept-language=zh-HK,en&q=" +
        encodeURIComponent(query);

      const response = await fetch(url, {
        headers: {
          "user-agent":
            "HKFamilyFunMigrationBot/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
          accept: "application/json",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        await sleep(1100);
        continue;
      }

      const rows = await response.json();
      const first = Array.isArray(rows) ? rows[0] : null;
      const latitude = Number(first?.lat);
      const longitude = Number(first?.lon);

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return {
          latitude,
          longitude,
          google_map_url:
            event.google_map_url ||
            "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(query),
        };
      }

      await sleep(1100);
    } catch {
      await sleep(1100);
    }
  }

  return null;
}

async function main() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id,title_tc,venue_name,address,district,google_map_url,latitude,longitude")
    .eq("status", "published")
    .eq("ai_extracted_json->>legacy_migration", "true")
    .or("latitude.is.null,longitude.is.null")
    .limit(50);

  if (error) throw error;

  let geocoded = 0;
  let failed = 0;

  for (const event of events || []) {
    const result = await geocode(event);

    if (!result) {
      failed++;
      await sleep(1100);
      continue;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update({
        latitude: result.latitude,
        longitude: result.longitude,
        google_map_url: result.google_map_url,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (updateError) failed++;
    else geocoded++;

    await sleep(1100);
  }

  console.log(
    JSON.stringify(
      {
        candidates: events?.length || 0,
        geocoded,
        failed,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
