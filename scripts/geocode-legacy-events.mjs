"use strict";

import { createClient } from "@supabase/supabase-js";

const URL =
  process.env.SUPABASE_URL || "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function text(value) {
  return String(value || "").trim();
}

function isGenericLocation(event) {
  const haystack = [event.venue_name, event.address]
    .map(text)
    .join(" ");

  return /全香港|不同義工|不同活動地點|各有不同|以個別活動/.test(haystack);
}

async function locationSearch(query) {
  const url =
    "https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q=" +
    encodeURIComponent(query);

  const response = await fetch(url, {
    headers: {
      "user-agent":
        "HKFamilyFun/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
      accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function toWgs84(x, y) {
  const url =
    "https://www.geodetic.gov.hk/transform/v2/?inSys=hkgrid&outSys=wgsgeog&e=" +
    encodeURIComponent(x) +
    "&n=" +
    encodeURIComponent(y);

  const response = await fetch(url, {
    headers: {
      "user-agent":
        "HKFamilyFun/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
      accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const latitude = Number(data?.wgsLat);
  const longitude = Number(data?.wgsLong);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

function chooseResult(rows, query) {
  if (!rows.length) return null;

  const q = text(query).toLowerCase();

  const exactish = rows.find((row) => {
    const name = text(row.nameZH || row.nameEN).toLowerCase();
    const address = text(row.addressZH || row.addressEN).toLowerCase();
    return (
      (name && (q.includes(name) || name.includes(q))) ||
      (address && q.length > 4 && (q.includes(address) || address.includes(q)))
    );
  });

  return exactish || rows[0];
}

async function geocode(event) {
  if (isGenericLocation(event)) return null;

  const queries = [
    text(event.venue_name),
    text(event.address),
    [text(event.venue_name), text(event.address)].filter(Boolean).join(" "),
  ].filter(Boolean);

  for (const query of [...new Set(queries)]) {
    try {
      const rows = await locationSearch(query);
      const match = chooseResult(rows, query);

      if (!match) {
        await sleep(1300);
        continue;
      }

      const x = Number(match.x);
      const y = Number(match.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        await sleep(1300);
        continue;
      }

      await sleep(1300);

      const wgs = await toWgs84(x, y);
      if (!wgs) {
        await sleep(1300);
        continue;
      }

      return {
        ...wgs,
        district: text(match.districtZH) || null,
        matched_name: text(match.nameZH || match.nameEN) || null,
        matched_address: text(match.addressZH || match.addressEN) || null,
        query,
      };
    } catch {
      await sleep(1300);
    }
  }

  return null;
}

async function main() {
  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id,title_tc,venue_name,address,district,google_map_url,latitude,longitude",
    )
    .eq("status", "published")
    .eq("ai_extracted_json->>legacy_migration", "true")
    .or("latitude.is.null,longitude.is.null")
    .limit(50);

  if (error) throw error;

  let geocoded = 0;
  let failed = 0;
  let generic = 0;
  const details = [];

  for (const event of events || []) {
    if (isGenericLocation(event)) {
      generic++;
      details.push({
        title: event.title_tc,
        result: "generic/multi-location event; no single pin",
      });
      continue;
    }

    const result = await geocode(event);

    if (!result) {
      failed++;
      details.push({
        title: event.title_tc,
        result: "not matched",
      });
      continue;
    }

    const mapQuery =
      text(event.address) || text(event.venue_name) || result.matched_name || "";

    const { error: updateError } = await supabase
      .from("events")
      .update({
        latitude: result.latitude,
        longitude: result.longitude,
        district: result.district || event.district,
        google_map_url:
          event.google_map_url ||
          "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(mapQuery),
        geocoded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (updateError) {
      failed++;
      details.push({
        title: event.title_tc,
        result: "database update failed: " + updateError.message,
      });
    } else {
      geocoded++;
      details.push({
        title: event.title_tc,
        result:
          "geocoded: " +
          result.latitude +
          "," +
          result.longitude +
          " · " +
          (result.district || ""),
      });
    }

    await sleep(1300);
  }

  console.log(
    JSON.stringify(
      {
        candidates: events?.length || 0,
        geocoded,
        generic,
        failed,
        details,
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
