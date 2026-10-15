import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/admin-auth";
import { CONSENT_COOKIE, ANALYTICS_CONSENT } from "@/lib/privacy/cookie-consent";

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
  // Back-end guard: browser requests without explicit opt-in never enter the analytics table.
  if (request.cookies.get(CONSENT_COOKIE)?.value !== ANALYTICS_CONSENT) {
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
  // Query strings can contain user search terms or other personal information.
  if (body.pagePath.includes("?") || body.pagePath.includes("#")) {
    return NextResponse.json({ error: "Path only is allowed" }, { status: 400 });
  }
  if (shouldIgnore(body.pagePath)) {
    return new NextResponse(null, { status: 204 });
  }

  // The public site is intentionally in maintenance mode, but legal pages
  // remain accessible. Do not silently discard visitor-consented analytics
  // for those pages. All other public routes stay suppressed until launch.
  if (process.env.MAINTENANCE_MODE === "true") {
    const legalPages = new Set([
      "/privacy",
      "/cookies",
      "/terms",
      "/merchant-terms",
      "/disclaimer",
      "/data-deletion",
    ]);
    if (!legalPages.has(body.pagePath.replace(/\\/$/, ""))) {
      return new NextResponse(null, { status: 204 });
    }
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
