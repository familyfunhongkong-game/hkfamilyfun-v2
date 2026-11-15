import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const manifests = [
  "data/verified-family-events-20261116-20270401.json",
  "data/verified-hkpl-addendum-202612-202704.json",
];
const fingerprints = new Set();
const tuples = new Set();
const counts = {};
let rows = 0;

function validCalendarDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

for (const path of manifests) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  assert.deepEqual(manifest.date_scope, ["2026-11-16", "2027-04-01"], path + ": scope drift");
  assert.ok(Array.isArray(manifest.records), "Expected records array");
  for (const item of manifest.records) {
    ++rows;
    assert.ok(item.key, "Missing stable manifest key");
    assert.ok(typeof item.title_tc === "string" && item.title_tc.trim().length >= 5, item.key + ": title");
    assert.ok(item.venue_name?.trim(), item.key + ": venue");
    assert.ok(item.organizer_name?.trim(), item.key + ": organizer");
    assert.ok(validCalendarDay(item.start_date) && validCalendarDay(item.end_date), item.key + ": invalid calendar dates");
    assert.ok(item.start_date <= item.end_date, item.key + ": end before start");
    assert.ok(item.start_date <= "2027-04-01" && item.end_date >= "2026-11-16", item.key + ": outside requested window");
    assert.ok(item.source_url?.startsWith("https://"), item.key + ": untrusted or missing source URL");
    assert.ok(item.official_url?.startsWith("https://"), item.key + ": missing organizer-related URL");
    assert.ok(item.price_label?.trim(), item.key + ": price/eligibility disclosure");
    assert.ok(["free", "paid", "mixed", "unknown"].includes(item.price_type), item.key + ": invalid price type");
    assert.ok(item.price_type !== "free" || item.is_free !== false, item.key + ": contradictory free classification");
    assert.ok(!(item.price_type === "free" && /HK\s*\$\s*[1-9]/i.test(item.price_label)), item.key + ": free price contradicts HK$");
    assert.ok(item.source_fingerprint === "hkff:curated:20261112:" + item.key, item.key + ": fingerprint drift");
    assert.ok(!fingerprints.has(item.source_fingerprint), item.key + ": duplicate fingerprint");
    fingerprints.add(item.source_fingerprint);
    const tuple = [item.title_tc, item.start_date, item.venue_name].join("|");
    assert.ok(!tuples.has(tuple), item.key + ": duplicate event and venue session");
    tuples.add(tuple);
    assert.ok(item.cover_image_url === "/images/verified-event-placeholder.svg", item.key + ": organizer image rights must not be assumed");
    assert.ok(existsSync("public" + item.cover_image_url), item.key + ": missing original fallback artwork");
    const month = item.start_date.slice(0,7);
    counts[month] = (counts[month] || 0) + 1;
  }
}
assert.equal(rows, 44, "Expected 44 curated records in final relaunch snapshot");
assert.ok(counts["2027-03"] >= 3 && counts["2027-04"] >= 2, "March / April 2027 must have verified coverage");
console.log("[curated-event-seeds] PASS: " + rows + " sourced, deduplicated records; local artwork available; dated Mar-Apr coverage; months=" + JSON.stringify(counts));
