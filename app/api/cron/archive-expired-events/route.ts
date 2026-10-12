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

type ArchivedEvent = {
  id: string;
  title_tc?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  previous_status: "published" | "draft";
};

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
  const archivePatch = {
    status: "archived",
    is_featured: false,
    updated_at: now,
  };

  const publishedResult = await admin
    .from("events")
    .update(archivePatch)
    .eq("status", "published")
    .not("end_date", "is", null)
    .lt("end_date", today)
    .or("recurrence_type.is.null,recurrence_type.eq.none")
    .select("id,title_tc,start_date,end_date");

  if (publishedResult.error) {
    console.error("archive-expired-events published cleanup failed", {
      code: publishedResult.error.code,
      message: publishedResult.error.message,
      details: publishedResult.error.details,
      hint: publishedResult.error.hint,
    });

    return NextResponse.json(
      { error: "Unable to archive expired published events" },
      { status: 500 },
    );
  }

  // Auto-discovery/import Drafts have no merchant owner. Once their known
  // event window has ended, keeping them in the review queue only creates
  // operational noise. Merchant-owned Drafts are intentionally excluded.
  const draftWithEndResult = await admin
    .from("events")
    .update(archivePatch)
    .eq("status", "draft")
    .is("merchant_id", null)
    .not("end_date", "is", null)
    .lt("end_date", today)
    .select("id,title_tc,start_date,end_date");

  if (draftWithEndResult.error) {
    console.error("archive-expired-events draft end-date cleanup failed", {
      code: draftWithEndResult.error.code,
      message: draftWithEndResult.error.message,
      details: draftWithEndResult.error.details,
      hint: draftWithEndResult.error.hint,
    });

    return NextResponse.json(
      { error: "Unable to archive expired unowned drafts" },
      { status: 500 },
    );
  }

  // A no-end-date recurring Draft may still describe an ongoing series, so
  // only one-off/no-recurrence Drafts are safe to archive by start date.
  const draftWithoutEndResult = await admin
    .from("events")
    .update(archivePatch)
    .eq("status", "draft")
    .is("merchant_id", null)
    .is("end_date", null)
    .lt("start_date", today)
    .or("recurrence_type.is.null,recurrence_type.eq.none")
    .select("id,title_tc,start_date,end_date");

  if (draftWithoutEndResult.error) {
    console.error("archive-expired-events draft start-date cleanup failed", {
      code: draftWithoutEndResult.error.code,
      message: draftWithoutEndResult.error.message,
      details: draftWithoutEndResult.error.details,
      hint: draftWithoutEndResult.error.hint,
    });

    return NextResponse.json(
      { error: "Unable to archive expired unowned drafts" },
      { status: 500 },
    );
  }

  const publishedArchived: ArchivedEvent[] = (publishedResult.data || []).map(
    (event) => ({ ...event, previous_status: "published" as const }),
  );
  const draftArchived: ArchivedEvent[] = [
    ...(draftWithEndResult.data || []),
    ...(draftWithoutEndResult.data || []),
  ].map((event) => ({ ...event, previous_status: "draft" as const }));
  const archived = [...publishedArchived, ...draftArchived];

  console.info("archive-expired-events completed", {
    hong_kong_date: today,
    archived_count: archived.length,
    archived_published_count: publishedArchived.length,
    archived_unowned_draft_count: draftArchived.length,
    archived_ids: archived.map((event) => event.id),
  });

  return NextResponse.json({
    ok: true,
    hong_kong_date: today,
    archived_count: archived.length,
    archived_published_count: publishedArchived.length,
    archived_unowned_draft_count: draftArchived.length,
    archived: archived.map((event) => ({
      id: event.id,
      title_tc: event.title_tc,
      start_date: event.start_date,
      end_date: event.end_date,
      previous_status: event.previous_status,
    })),
  });
}
