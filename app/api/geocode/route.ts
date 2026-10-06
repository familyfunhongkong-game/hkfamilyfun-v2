import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

async function authorize(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    return {
      ok: false as const,
      status: 503,
      error: "Authentication service unavailable",
    };
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });

  const { data, error } = await client.auth.getUser(token);
  const user = data.user;

  if (error || !user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const { data: isAdmin } = await client.rpc("is_platform_admin");
  if (isAdmin === true) {
    return { ok: true as const };
  }

  const { data: merchant } = await client
    .from("merchants")
    .select("id,status")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (merchant?.status === "approved") {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: 403,
    error: "Approved merchant or Admin access required",
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const query = (request.nextUrl.searchParams.get("q") || "").trim();

  if (!query || query.length > 240) {
    return NextResponse.json(
      { error: "Invalid query" },
      { status: 400 },
    );
  }

  const endpoint =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=hk&q=" +
    encodeURIComponent(query);

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "HKFamilyFunGeocoder/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
    },
    next: {
      revalidate: 86400,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Geocoding unavailable" },
      { status: 502 },
    );
  }

  const rows = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  const first = rows[0];

  if (!first?.lat || !first?.lon) {
    return NextResponse.json(
      { found: false },
      {
        headers: {
          "Cache-Control": "private, max-age=0, no-store",
        },
      },
    );
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ found: false });
  }

  // Extra guard: only return coordinates within Hong Kong's broad bounds.
  if (lat < 22.10 || lat > 22.60 || lng < 113.80 || lng > 114.50) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json(
    {
      found: true,
      lat,
      lng,
      displayName: first.display_name || "",
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, no-store",
      },
    },
  );
}
