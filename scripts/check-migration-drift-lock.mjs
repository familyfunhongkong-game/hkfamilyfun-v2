import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const guard = await readFile(
  "scripts/guard-db-push-until-migration-repair.mjs",
  "utf8",
);

let failed = false;

if (
  pkg.scripts?.["db:push"] !==
  "node scripts/guard-db-push-until-migration-repair.mjs"
) {
  console.error(
    "[migration-drift] npm db:push must remain locked until issue #52 is completed",
  );
  failed = true;
}

for (const signal of [
  "issues/52",
  "supabase migration list",
  "supabase migration repair",
  "supabase db pull",
  "process.exit(1)",
]) {
  if (!guard.includes(signal)) {
    console.error("[migration-drift] guard missing: " + signal);
    failed = true;
  }
}

if (guard.includes("supabase db push")) {
  console.error("[migration-drift] guard must not provide an unsafe db-push bypass");
  failed = true;
}

if (failed) process.exit(1);

console.log(
  "[migration-drift] OK — routine npm db:push is blocked until Supabase history repair is completed.",
);
