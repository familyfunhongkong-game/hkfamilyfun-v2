import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Strict public-display allowlist; never select contact details, approval notes,
// merchant ownership, service keys, or private draft fields.
const publicFields = "id,title_tc,title_sc,title_en,short_description_tc,short_description_sc,short_description_en,organizer_name,merchant_name,start_date,end_date,recurrence_type,recurrence_weekdays,recurrence_include_dates,recurrence_exclude_dates,start_time,end_time,district,mtr_station,cover_image_url,price_type,price_display_mode,price_label,min_price,max_price,age_min,age_max,age_groups,tags,activity_category,category,is_free,is_sen_friendly,is_indoor,registration_url,booking_url,official_url,source_url";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hongKongToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (key: string) => parts.find((part) => part.type === key)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400, headers }); }
  const ids = body && typeof body === "object" && "ids" in body ? (body as { ids: unknown }).ids : null;
  if (!Array.isArray(ids) || ids.length > 100 || !ids.every((id) => typeof id === "string" && uuid.test(id))) {
    return NextResponse.json({ error: "Invalid event IDs" }, { status: 400, headers });
  }
  if (!ids.length) return NextResponse.json({ events: [] }, { headers });

  const admin = serviceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers });

  // Only records explicitly archived AFTER having been publicly published.
  // Editorial withdrawals, rejected records, drafts and future-dated archives
  // must never reappear merely because a browser knows their UUID.
  const { data, error } = await admin.from("events")
    .select(publicFields + ",published_at")
    .in("id", [...new Set(ids)])
    .eq("status", "archived")
    .not("published_at", "is", null)
    .or("hidden_pending_confirmation.is.null,hidden_pending_confirmation.eq.false");
  if (error) {
    console.error("saved-events archive lookup failed", { code: error.code });
    return NextResponse.json({ error: "Archive unavailable" }, { status: 500, headers });
  }

  const today = hongKongToday();
  // The select column list is intentionally assembled from a fixed allowlist.
  // Supabase cannot infer a row type for this dynamic string at compile time.
  type ArchiveRow = { id: string; start_date: string | null; end_date: string | null; published_at: string | null } & Record<string, unknown>;
  const rows = (data || []) as unknown as ArchiveRow[];
  const events = rows
    .filter((event) => {
      const lastDate = String(event.end_date || event.start_date || "").slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(lastDate) && lastDate < today;
    })
    .map(({ published_at: _publishedAt, ...event }) => ({ ...event, archived: true }));
  return NextResponse.json({ events }, { headers });
}
