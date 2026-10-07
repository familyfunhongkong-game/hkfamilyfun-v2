import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hongKongToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return get("year") + "-" + get("month") + "-" + get("day");
}

export async function GET(request: NextRequest) {
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  const authorization = request.headers.get("authorization") || "";

  if (!cronSecret || authorization !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = serviceClient();
  if (!admin) {
    console.error("archive-expired-events: Supabase service client unavailable");
    return NextResponse.json(
      { error: "Supabase service client unavailable" },
      { status: 503 },
    );
  }

  const today = hongKongToday();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("events")
    .update({
      status: "archived",
      is_featured: false,
      updated_at: now,
    })
    .eq("status", "published")
    .not("end_date", "is", null)
    .lt("end_date", today)
    .or("recurrence_type.is.null,recurrence_type.eq.none")
    .select("id,title_tc,end_date");

  if (error) {
    console.error("archive-expired-events failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { error: "Unable to archive expired events" },
      { status: 500 },
    );
  }

  const archived = data || [];

  console.info("archive-expired-events completed", {
    hong_kong_date: today,
    archived_count: archived.length,
    archived_ids: archived.map((event) => event.id),
  });

  return NextResponse.json({
    ok: true,
    hong_kong_date: today,
    archived_count: archived.length,
    archived: archived.map((event) => ({
      id: event.id,
      title_tc: event.title_tc,
      end_date: event.end_date,
    })),
  });
}
