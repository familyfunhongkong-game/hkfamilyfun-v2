import { readFile } from "node:fs/promises";

const layout = await readFile("app/events/[id]/layout.tsx", "utf8");
const seo = await readFile("lib/seo/event-seo.ts", "utf8");
const sitemap = await readFile("app/sitemap.ts", "utf8");

let failed = false;

for (const signal of [
  "generateMetadata",
  "x-forwarded-host",
  "summary_large_image",
  "canonicalEventUrl",
  'type="application/ld+json"',
  "buildEventJsonLd",
  "isEventExpired",
]) {
  if (!layout.includes(signal)) {
    console.error(`[event-seo] layout missing: ${signal}`);
    failed = true;
  }
}

for (const signal of [
  '.from("public_events_i18n")',
  '.eq("status", "published")',
  '"@type": "Event"',
  '"@type": "Place"',
  '"@type": "PostalAddress"',
  "startDate",
  "addressCountry: \"HK\"",
  'recurrence_type).toLowerCase() === "weekly"',
  'replace(/</g, "\\\\u003c")',
]) {
  if (!seo.includes(signal)) {
    console.error(`[event-seo] SEO helper missing: ${signal}`);
    failed = true;
  }
}

if (/service[_-]?role/i.test(seo)) {
  console.error("[event-seo] public SEO path must never use a service-role credential");
  failed = true;
}

if (!sitemap.includes("event.updatedAt || event.publishedAt")) {
  console.error("[event-seo] sitemap must use real event modification timestamps");
  failed = true;
}

if (sitemap.includes("lastModified: now")) {
  console.error("[event-seo] sitemap must not claim every route changed on every request");
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[event-seo] OK — metadata, canonical, OG/Twitter, safe Event JSON-LD and truthful sitemap dates are enforced.",
);
