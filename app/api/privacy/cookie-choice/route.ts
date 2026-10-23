import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_CONSENT, CONSENT_COOKIE, ESSENTIAL_CONSENT } from "@/lib/privacy/cookie-consent";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  // Consent is user-initiated. Do not let another website enable tracking by CSRF.
  const sameOrigin = origin === request.nextUrl.origin;
  const trustedFetchSite = !origin && fetchSite === "same-origin";
  if ((!sameOrigin && !trustedFetchSite) || fetchSite === "cross-site") {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const value = form.get("choice");
  if (value !== "essential" && value !== "analytics" && value !== "custom") {
    return NextResponse.json({ error: "Invalid cookie choice" }, { status: 400 });
  }

  const analytics = value === "analytics" ||
    (value === "custom" && form.get("analytics") === "yes");
  const destination = new URL("/cookies", request.url);
  destination.searchParams.set("saved", analytics ? "analytics" : "essential");
  destination.hash = "cookie-settings";
  const response = NextResponse.redirect(destination, { status: 303 });
  response.cookies.set(CONSENT_COOKIE, analytics ? ANALYTICS_CONSENT : ESSENTIAL_CONSENT, {
    path: "/",
    maxAge: 180 * 24 * 60 * 60,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    httpOnly: false, // The optional first-party analytics gate reads this cookie on the client.
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
