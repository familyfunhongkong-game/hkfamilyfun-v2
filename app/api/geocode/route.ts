import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
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
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
