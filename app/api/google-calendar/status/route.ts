import { NextRequest, NextResponse } from "next/server";
import {
  calendarCookieName,
  decryptCalendarSession,
} from "@/lib/google-calendar-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
  );

  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
    });
  }

  const encrypted = request.cookies.get(calendarCookieName())?.value;
  const session = decryptCalendarSession(encrypted);

  return NextResponse.json({
    configured: true,
    connected: Boolean(session),
  });
}
