import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = await request.json();
  const id = clean(body?.id);
  if (!id) return NextResponse.json({ error: "Missing intake id" }, { status: 400 });

  const intake = await admin.client
    .from("intake_submissions")
    .select("id,status,normalized_payload,linked_event_id")
    .eq("id", id)
    .maybeSingle();

  if (intake.error || !intake.data) {
    return NextResponse.json({ error: intake.error?.message || "Intake not found" }, { status: 404 });
  }

  if (intake.data.linked_event_id) {
    return NextResponse.json({
      ok: true,
      event_id: intake.data.linked_event_id,
      already_linked: true,
    });
  }

  const n = (intake.data.normalized_payload || {}) as Record<string, unknown>;
  const title = clean(n.title_tc);
  if (!title) {
    return NextResponse.json(
      { error: "請先 Normalize，並確認繁中活動標題。" },
      { status: 409 },
    );
  }

  const minPrice =
    typeof n.min_price === "number"
      ? n.min_price
      : Number.isFinite(Number(clean(n.min_price)))
        ? Number(clean(n.min_price))
        : null;
  const tags = Array.isArray(n.tags)
    ? n.tags.map((item) => clean(item)).filter(Boolean).join(",")
    : clean(n.tags);
  const isFree = clean(n.price_display_mode) === "free" || minPrice === 0;

  const payload = {
    title_tc: title,
    title_sc: clean(n.title_sc) || null,
    title_en: clean(n.title_en) || null,
    short_description_tc: clean(n.short_description_tc) || null,
    start_date: clean(n.start_date) || null,
    end_date: clean(n.end_date) || null,
    start_time: clean(n.start_time) || null,
    end_time: clean(n.end_time) || null,
    venue_name: clean(n.venue_name) || null,
    address: clean(n.address) || null,
    district: clean(n.district) || null,
    mtr_station: clean(n.mtr_station) || null,
    activity_category: clean(n.activity_category) || null,
    price_type: isFree ? "free" : minPrice !== null ? "paid" : "unknown",
    price_display_mode: clean(n.price_display_mode) || null,
    price_min: minPrice,
    min_price: minPrice === null ? null : String(minPrice),
    price_label: clean(n.price_label) || null,
    is_free: isFree,
    registration_url: clean(n.registration_url) || null,
    official_url: clean(n.official_url) || null,
    source_url: clean(n.official_url || n.registration_url) || null,
    google_map_url: clean(n.google_map_url) || null,
    cover_image_url: clean(n.cover_image_url) || null,
    organizer_name: clean(n.organizer_name) || null,
    contact_email: clean(n.contact_email) || null,
    contact_phone: clean(n.contact_phone) || null,
    whatsapp: clean(n.whatsapp) || null,
    tags: tags || null,
    source_type: "manual",
    status: "draft",
  };

  const created = await admin.client
    .from("events")
    .insert(payload)
    .select("id")
    .single();

  if (created.error || !created.data) {
    return NextResponse.json(
      { error: created.error?.message || "Could not create event draft" },
      { status: 500 },
    );
  }

  const linked = await admin.client
    .from("intake_submissions")
    .update({
      linked_event_id: created.data.id,
      status: "linked",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (linked.error) {
    return NextResponse.json(
      { error: linked.error.message, event_id: created.data.id },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, event_id: created.data.id });
}
