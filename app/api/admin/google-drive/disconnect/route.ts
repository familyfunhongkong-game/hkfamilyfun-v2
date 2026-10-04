import { NextRequest, NextResponse } from "next/server";
import { decryptAdminGoogleToken } from "@/lib/admin-google-drive";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);

  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { data } = await admin.client
    .from("admin_integrations")
    .select("encrypted_refresh_token")
    .eq("provider", "google_drive")
    .maybeSingle();

  const refreshToken = decryptAdminGoogleToken(data?.encrypted_refresh_token);

  if (refreshToken) {
    try {
      await fetch(
        "https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(refreshToken),
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          cache: "no-store",
        },
      );
    } catch {
      // Local disconnect must still succeed if Google's revoke endpoint is unavailable.
    }
  }

  const { error } = await admin.client
    .from("admin_integrations")
    .update({
      status: "disconnected",
      account_email: null,
      encrypted_refresh_token: null,
      granted_scopes: [],
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "google_drive");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, disconnected: true });
}
