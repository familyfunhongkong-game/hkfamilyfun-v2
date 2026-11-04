import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";
import { hongKongToday } from "@/lib/events/visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!uuid.test(id)) return NextResponse.json({ ended: false }, { status: 404, headers });
  const client = serviceClient();
  if (!client) return NextResponse.json({ ended: false }, { status: 503, headers });
  // Deliberately expose no event fields or draft metadata. Ended is the ONLY
  // public answer, for an already-published, genuinely past, non-hidden event.
  const { data, error } = await client.from("events")
    .select("status,published_at,start_date,end_date,hidden_pending_confirmation")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Public expired-event status failed", error.code);
    return NextResponse.json({ ended: false }, { status: 503, headers });
  }
  const isPublishedHistory = data?.published_at &&
    data.status === "published" &&
    data.hidden_pending_confirmation !== true;
  const end = String(data?.end_date || data?.start_date || "").slice(0, 10);
  const ended = Boolean(isPublishedHistory && /^\d{4}-\d{2}-\d{2}$/.test(end) && end < hongKongToday());
  return NextResponse.json({ ended }, { status: ended ? 200 : 404, headers });
}
