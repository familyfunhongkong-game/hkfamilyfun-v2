import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";

const allowedPlacements = new Set([
  "home_top",
  "home_middle",
  "events_top",
  "news_top",
  "article_inline",
]);

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bannerId = String(body.banner_id || "").trim();
  const eventType = String(body.event_type || "").trim();
  const placement = String(body.placement || "").trim();
  const pagePath = String(body.page_path || "").trim().slice(0, 300);

  if (
    !validUuid(bannerId) ||
    !["impression", "click"].includes(eventType) ||
    !allowedPlacements.has(placement)
  ) {
    return NextResponse.json({ error: "Invalid promotion event" }, { status: 400 });
  }

  const admin = serviceClient();
  if (!admin) {
    console.error("promotion-event: Supabase service client unavailable");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: banner, error: bannerError } = await admin
    .from("promo_banners")
    .select("id,status,placement,starts_at,ends_at")
    .eq("id", bannerId)
    .maybeSingle();

  if (bannerError || !banner) {
    return new NextResponse(null, { status: 204 });
  }

  const now = Date.now();
  const startsAt = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
  const endsAt = banner.ends_at ? new Date(banner.ends_at).getTime() : null;

  if (
    banner.status !== "active" ||
    banner.placement !== placement ||
    (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) ||
    (endsAt !== null && Number.isFinite(endsAt) && endsAt < now)
  ) {
    return new NextResponse(null, { status: 204 });
  }

  const { error } = await admin.from("promotion_events").insert({
    banner_id: bannerId,
    event_type: eventType,
    placement,
    page_path: pagePath || null,
  });

  if (error) {
    console.error("promotion-event insert failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ error: "Unable to record promotion event" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
