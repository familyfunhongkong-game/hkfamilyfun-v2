import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";

const payloadSchema = z.object({
  visitorId: z.string().uuid(),
  sessionId: z.string().uuid(),
  eventType: z.enum(["page_view", "event_view", "cta_click"]),
  pagePath: z.string().min(1).max(300),
  eventId: z.string().uuid().nullable().optional(),
  referrerHostname: z.string().max(180).nullable().optional(),
  deviceType: z.enum(["mobile", "tablet", "desktop", "unknown"]),
});

function shouldIgnore(pathname: string) {
  return (
    pathname === "/maintenance" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/merchant") ||
    pathname.startsWith("/api")
  );
}

export async function POST(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === "true") {
    return new NextResponse(null, { status: 204 });
  }

  const host = request.headers.get("host")?.toLowerCase() || "";
  if (host !== "www.hkfamilyfun.com" && host !== "hkfamilyfun.com") {
    return new NextResponse(null, { status: 204 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
  }

  const body = parsed.data;
  if (shouldIgnore(body.pagePath)) {
    return new NextResponse(null, { status: 204 });
  }

  const client = serviceClient();
  if (!client) {
    return new NextResponse(null, { status: 204 });
  }

  const { error } = await client.from("site_analytics_events").insert({
    visitor_id: body.visitorId,
    session_id: body.sessionId,
    event_type: body.eventType,
    page_path: body.pagePath,
    event_id: body.eventId || null,
    referrer_hostname: body.referrerHostname || null,
    device_type: body.deviceType,
  });

  if (error) {
    console.error("site analytics insert failed", error.message);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }

  return new NextResponse(null, { status: 204 });
}
