import { NextRequest, NextResponse } from "next/server";

// Smart-expiry policy: time-based visibility must never mutate editorial status.
// Keep this authenticated endpoint for existing Vercel Cron configuration while
// event listing/detail filters are migrated to computed occurrence availability.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  const authorization = request.headers.get("authorization") || "";

  if (!cronSecret || authorization !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Intentionally read-only. Previously this cron changed published and
  // unowned draft events to archived solely based on calendar dates.
  // Editorial archive remains an explicit authorized Admin operation.
  return NextResponse.json({
    ok: true,
    policy: "smart-expiry-read-only",
    archived_count: 0,
    archived_published_count: 0,
    archived_unowned_draft_count: 0,
    message: "Automatic archival disabled; event visibility must use occurrence dates.",
  });
}
