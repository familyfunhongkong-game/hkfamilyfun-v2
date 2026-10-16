import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/admin-auth";
import { AnalyticsReportLimitError, getSiteAnalyticsSummary } from "@/lib/admin-analytics-summary";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  const admin = await requireAdmin(token);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const start = request.nextUrl.searchParams.get("start") || "";
  const parsedStart = new Date(start);
  if (!start || Number.isNaN(parsedStart.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }

  const client = serviceClient();
  if (!client) {
    return NextResponse.json({ error: "Analytics service unavailable" }, { status: 503 });
  }

  try {
    const data = await getSiteAnalyticsSummary(client, parsedStart.toISOString());
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof AnalyticsReportLimitError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    console.error("admin analytics summary failed", error);
    return NextResponse.json({ error: "Analytics query failed" }, { status: 503 });
  }
}
