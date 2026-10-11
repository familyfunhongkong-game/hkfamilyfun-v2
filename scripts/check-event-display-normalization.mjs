import { readFile } from "node:fs/promises";

const helper = await readFile("lib/events/display-normalization.ts", "utf8");
const search = await readFile(
  "components/events/PublicEventsSearchClient.tsx",
  "utf8",
);
const detail = await readFile("app/events/[id]/page.tsx", "utf8");
const mapper = await readFile("lib/supabase/events.ts", "utf8");

let failed = false;

function requireSignal(label, source, signal) {
  if (!source.includes(signal)) {
    console.error(`[event-display] ${label} missing: ${signal}`);
    failed = true;
  }
}

for (const signal of [
  'text.startsWith("{") && text.endsWith("}")',
  "normalizeEventTags",
  "formatEventCategory",
  'arts_event: ["文化藝術"',
  'festival: ["節慶活動"',
]) {
  requireSignal("shared normalization", helper, signal);
}

for (const [label, source] of [
  ["event search", search],
  ["event detail", detail],
]) {
  requireSignal(label, source, "normalizeEventTags");
  requireSignal(label, source, "formatEventCategory");
  requireSignal(label, source, "event.activity_category ||");
}

for (const signal of [
  "normalizeEventTags(value, 8)",
  "formatEventCategory(",
  "event.activity_category || event.category",
]) {
  requireSignal("shared public mapper", mapper, signal);
}

if (
  search.includes("event.category ||\n      event.activity_category") ||
  detail.includes("event.category ||\n      event.activity_category")
) {
  console.error(
    "[event-display] curated activity_category must take precedence over raw category code",
  );
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[event-display] OK — Postgres-array tags and internal category codes are normalized before public display.",
);
