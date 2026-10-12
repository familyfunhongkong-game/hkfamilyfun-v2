import { readFile } from "node:fs/promises";

const source = await readFile("app/merchant/events/[id]/preview/page.tsx", "utf8");

const requiredSignals = [
  "activity_category",
  "venue_name?: string",
  "address?: string",
  "price_display_mode",
  "price_label",
  "max_price",
  "offer_price",
  "age_min",
  "age_max",
  "is_sen_friendly",
  "is_indoor",
  "booking_url",
  "official_url",
  "cta_type",
  "cta_label",
  "formatAge(event)",
  "event.venue_name || event.venue_name_tc",
  "event.address || event.address_tc",
  "event.cta_label || event.cta_text",
];

let failed = false;

for (const signal of requiredSignals) {
  if (!source.includes(signal)) {
    console.error(`[merchant-preview] missing current-schema signal: ${signal}`);
    failed = true;
  }
}

const categoryFunctionStart = source.indexOf("function getCategoryLabel");
const activityCategoryIndex = source.indexOf(
  'safeText(event.activity_category, "")',
  categoryFunctionStart,
);
const legacyCategoryIndex = source.indexOf(
  'safeText(event.category, "")',
  categoryFunctionStart,
);

if (
  categoryFunctionStart < 0 ||
  activityCategoryIndex < 0 ||
  legacyCategoryIndex < 0 ||
  activityCategoryIndex > legacyCategoryIndex
) {
  console.error("[merchant-preview] activity_category must take precedence over legacy category");
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[merchant-preview] OK — preview consumes current edit/public event schema including price, location, age, accessibility and CTA fields.",
);
