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
    district: clean(n.district) || null,
    price_display_mode: clean(n.price_display_mode) || null,
    min_price: typeof n.min_price === "number" ? n.min_price : null,
    registration_url: clean(n.registration_url) || null,
    official_url: clean(n.official_url) || null,
    source_url: clean(n.official_url || n.registration_url) || null,
    tags: Array.isArray(n.tags) ? n.tags : [],
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
