const issueUrl =
  "https://github.com/familyfunhongkong-game/hkfamilyfun-v2/issues/52";

console.error("");
console.error("HK Family Fun database push is intentionally locked.");
console.error("");
console.error(
  "Production Supabase schema is healthy, but local and remote migration history are not fully aligned.",
);
console.error(
  "Do not run db push until migration history is repaired with the official Supabase CLI workflow:",
);
console.error("  1. supabase migration list");
console.error("  2. supabase migration repair --status applied|reverted <timestamp>");
console.error("  3. supabase db pull if needed");
console.error("  4. verify zero local/remote drift on a disposable replay");
console.error("");
console.error("Tracking issue: " + issueUrl);
console.error("");
process.exit(1);
