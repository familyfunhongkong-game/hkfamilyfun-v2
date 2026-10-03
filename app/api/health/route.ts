import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publicKey) {
    return NextResponse.json(
      { ok: false, service: "hkfamilyfun-v2", reason: "database_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const client = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, count, error } = await client
    .from("public_events_i18n")
    .select("id", { count: "exact" })
    .limit(1);

  if (error) {
    return NextResponse.json(
      { ok: false, service: "hkfamilyfun-v2", reason: "database_query_failed" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      service: "hkfamilyfun-v2",
      publicEventCount: count ?? 0,
      samplePublicEventId: data?.[0]?.id || null,
      buildSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
