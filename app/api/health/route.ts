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
      {
        ok: false,
        service: "hkfamilyfun-v2",
        error: "Public database configuration is missing.",
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
        checkedAt: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  const client = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error } = await client
    .from("public_events")
    .select("id", { count: "exact", head: true });

  return NextResponse.json(
    {
      ok: !error,
      service: "hkfamilyfun-v2",
      publicEventCount: count ?? null,
      error: error?.message || null,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      checkedAt: new Date().toISOString(),
    },
    {
      status: error ? 503 : 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
