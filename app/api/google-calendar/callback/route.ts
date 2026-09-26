import { NextRequest, NextResponse } from "next/server";
import {
  calendarCookieName,
  encryptCalendarSession,
} from "@/lib/google-calendar-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("hkff_google_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL("/planner?calendar=error", request.nextUrl.origin),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    request.nextUrl.origin + "/api/google-calendar/callback";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/planner?calendar=not-configured", request.nextUrl.origin),
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL("/planner?calendar=error", request.nextUrl.origin),
    );
  }

  const token = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!token.access_token) {
    return NextResponse.redirect(
      new URL("/planner?calendar=error", request.nextUrl.origin),
    );
  }

  const encrypted = encryptCalendarSession({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + (token.expires_in || 3600) * 1000 - 60_000,
  });

  const response = NextResponse.redirect(
    new URL("/planner?calendar=connected", request.nextUrl.origin),
  );

  response.cookies.set(calendarCookieName(), encrypted, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  response.cookies.delete("hkff_google_oauth_state");

  return response;
}
