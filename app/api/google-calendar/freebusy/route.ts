import { NextRequest, NextResponse } from "next/server";
import {
  calendarCookieName,
  decryptCalendarSession,
  encryptCalendarSession,
  refreshCalendarSession,
} from "@/lib/google-calendar-session";

export const runtime = "nodejs";

function addOneDay(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateText;

  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]) + 1,
    ),
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export async function GET(request: NextRequest) {
  const date = (request.nextUrl.searchParams.get("date") || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date" },
      { status: 400 },
    );
  }

  const encrypted = request.cookies.get(calendarCookieName())?.value;
  let session = decryptCalendarSession(encrypted);

  if (!session) {
    return NextResponse.json(
      { connected: false, busy: [] },
      { status: 401 },
    );
  }

  let refreshed = false;

  if (session.expiresAt <= Date.now()) {
    const next = await refreshCalendarSession(session);

    if (!next) {
      return NextResponse.json(
        { connected: false, busy: [] },
        { status: 401 },
      );
    }

    session = next;
    refreshed = true;
  }

  const timeMin = date + "T00:00:00+08:00";
  const timeMax = addOneDay(date) + "T00:00:00+08:00";

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "Asia/Hong_Kong",
        items: [{ id: "primary" }],
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Google Calendar free/busy request failed" },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    calendars?: {
      primary?: {
        busy?: Array<{ start?: string; end?: string }>;
      };
    };
  };

  const busy = (data.calendars?.primary?.busy || [])
    .filter((item) => item.start && item.end)
    .map((item) => ({
      start: item.start as string,
      end: item.end as string,
    }));

  const nextResponse = NextResponse.json({
    connected: true,
    busy,
  });

  if (refreshed) {
    nextResponse.cookies.set(
      calendarCookieName(),
      encryptCalendarSession(session),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );
  }

  return nextResponse;
}
