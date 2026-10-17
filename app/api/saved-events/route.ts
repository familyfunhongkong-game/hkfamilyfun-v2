import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fields = "id,title_tc,title_sc,title_en,short_description_tc,short_description_sc,short_description_en,organizer_name,merchant_name,start_date,end_date,start_time,end_time,district,mtr_station,cover_image_url,price_type,price_display_mode,price_label,min_price,max_price,age_min,age_max,age_groups,tags,activity_category,category,is_free,is_sen_friendly,is_indoor,registration_url,booking_url,official_url,source_url,recurrence_type,recurrence_weekdays,recurrence_include_dates,recurrence_exclude_dates";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("ids" in body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ids = (body as { ids: unknown }).ids;
  if (!Array.isArray(ids) || ids.length > 100 || !ids.every((id) => typeof id === "string" && uuid.test(id))) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
  }
  const admin = serviceClient();
  if (!admin) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  if (!ids.length) return NextResponse.json({ events: [] }, { headers: { "Cache-Control": "private, no-store" } });
  // Only previously published, non-hidden records. Never expose draft, rejected,
  // unpublished, pending-confirmation or merchant-private fields.
  const { data, error } = await admin.from("events").select(fields)
    .in("id", Array.from(new Set(ids)))
    .or("status.eq.published,and(status.eq.archived,published_at.not.is.null)")
    .or("hidden_pending_confirmation.is.null,hidden_pending_confirmation.eq.false");
  if (error) {
    console.error("Saved events lookup failed", error.code);
    return NextResponse.json({ error: "Unable to load saved events" }, { status: 500 });
  }
  return NextResponse.json({ events: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}
