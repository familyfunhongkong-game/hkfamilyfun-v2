import { NextRequest, NextResponse } from "next/server";
import { getServerLocale } from "@/lib/i18n/server";
import {
  LOCALE_COOKIE,
  normalizeLocale,
} from "@/lib/i18n/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = normalizeLocale(body?.locale);

    const response = NextResponse.json({ ok: true, locale });
    response.cookies.set({
      name: LOCALE_COOKIE,
      value: locale,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid locale request." },
      { status: 400 },
    );
  }
}

// Locale preference is harmless to expose. The cookie itself remains HttpOnly.
export async function GET() {
  const locale = await getServerLocale();
  return NextResponse.json({ locale }, { headers: { "Cache-Control": "private, no-store" } });
}
