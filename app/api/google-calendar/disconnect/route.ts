import { NextResponse } from "next/server";
import { calendarCookieName } from "@/lib/google-calendar-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ disconnected: true });
  response.cookies.set(calendarCookieName(), "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
