import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function publicKeyKind(value?: string) {
  if (!value) return "missing";
  if (value.startsWith("sb_publishable_")) return "publishable";

  const parts = value.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      );
      return payload?.role ? `jwt:${String(payload.role)}` : "jwt";
    } catch {
      return "jwt:unreadable";
    }
  }

  return "unknown";
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let publicEventCount: number | null = null;
  let demoEventStatus: string | null = null;
  let queryError: string | null = null;

  if (supabaseUrl && publicKey) {
    const client = createClient(supabaseUrl, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const countResult = await client
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");

    publicEventCount = countResult.count ?? null;

    const demoResult = await client
      .from("events")
      .select("status")
      .eq("id", "bbbb3e2a-ea80-4acb-a70d-989b0f8577e2")
      .maybeSingle();

    demoEventStatus = demoResult.data?.status ?? null;
    queryError =
      countResult.error?.message || demoResult.error?.message || null;
  }

  return NextResponse.json(
    {
      ok: true,
      service: "hkfamilyfun-v2",
      supabaseProjectRef: projectRefFromUrl(supabaseUrl),
      publicKeyKind: publicKeyKind(publicKey),
      publicEventCount,
      demoEventStatus,
      queryError,
      hasSupabasePublishableKey: Boolean(publicKey),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_KEY),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
