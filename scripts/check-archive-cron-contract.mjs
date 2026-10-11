import { readFile } from "node:fs/promises";

const route = await readFile(
  "app/api/cron/archive-expired-events/route.ts",
  "utf8",
);
const vercel = await readFile("vercel.json", "utf8");

const requiredSignals = [
  'authorization !== "Bearer " + cronSecret',
  '.eq("status", "published")',
  '.eq("status", "draft")',
  '.is("merchant_id", null)',
  '.not("end_date", "is", null)',
  '.is("end_date", null)',
  '.lt("start_date", today)',
  '.or("recurrence_type.is.null,recurrence_type.eq.none")',
  "archived_unowned_draft_count",
];

let failed = false;

for (const signal of requiredSignals) {
  if (!route.includes(signal)) {
    console.error(`[archive-cron] missing safety signal: ${signal}`);
    failed = true;
  }
}

if (route.includes(".delete(")) {
  console.error("[archive-cron] maintenance must archive, never delete events");
  failed = true;
}

if (!vercel.includes('"/api/cron/archive-expired-events"')) {
  console.error("[archive-cron] Vercel schedule missing archive endpoint");
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[archive-cron] OK — expired public events and unowned one-off drafts auto-archive without touching merchant-owned drafts.",
);
