import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);

  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const encryptionKey = String(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "").trim();

  if (!clientId || !encryptionKey) {
    return NextResponse.json(
      { error: "Google Drive OAuth 尚未設定。" },
      { status: 503 },
    );
  }

  const redirectUri =
    String(process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI || "").trim() ||
    request.nextUrl.origin + "/api/admin/google-drive/callback";

  const state = crypto.randomBytes(24).toString("hex");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ].join(" "),
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  if (admin.user.email) {
    authUrl.searchParams.set("login_hint", admin.user.email);
  }

  const response = NextResponse.json({ ok: true, url: authUrl.toString() });
  response.cookies.set("hkff_admin_drive_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  response.cookies.set("hkff_admin_drive_redirect", redirectUri, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
