import { readFile } from "node:fs/promises";

const route = await readFile("app/events/page.tsx", "utf8");
const client = await readFile(
  "components/events/PublicEventsSearchClient.tsx",
  "utf8",
);
const loader = await readFile("lib/events/public-event-records.ts", "utf8");

let failed = false;

function requireSignal(label, source, signal) {
  if (!source.includes(signal)) {
    console.error(`[events-ssr] ${label} missing: ${signal}`);
    failed = true;
  }
}

if (route.includes('"use client"') || route.includes("'use client'")) {
  console.error("[events-ssr] /events route must remain a Server Component");
  failed = true;
}

for (const signal of [
  "getServerLocale",
  "getPublicEventRecords",
  "initialEvents={initialEvents}",
  "initialLocale={initialLocale}",
  'dynamic = "force-dynamic"',
]) {
  requireSignal("server route", route, signal);
}

for (const signal of [
  '"use client"',
  "initialEvents: EventRecord[]",
  "initialLocale: AppLocale",
  "initialEvents.filter(canShowPublic)",
  'from("public_events_i18n")',
  "if (initialEvents.length > 0) return",
]) {
  requireSignal("client search", client, signal);
}

for (const signal of [
  'from("public_events_i18n")',
  '.eq("status", "published")',
  '.order("start_date", { ascending: true })',
]) {
  requireSignal("server loader", loader, signal);
}

const preloadIndex = route.indexOf("getPublicEventRecords()");
const renderIndex = route.indexOf("initialEvents={initialEvents}");
if (preloadIndex < 0 || renderIndex < 0 || preloadIndex > renderIndex) {
  console.error("[events-ssr] public records must be loaded before rendering the client search");
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[events-ssr] OK — /events server-preloads public records and retains a client fallback for interactive filtering.",
);
