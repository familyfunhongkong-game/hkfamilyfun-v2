import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function projectRefFromUrl(value?: string) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    return host.endsWith(".supabase.co") ? host.split(".")[0] : host;
  } catch {
    return "invalid";
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return NextResponse.json(
    {
      ok: true,
      service: "hkfamilyfun-v2",
      supabaseProjectRef: projectRefFromUrl(supabaseUrl),
      hasSupabasePublishableKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_KEY),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
