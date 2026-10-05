import { isGoogleServiceAccountConfigured } from "@/lib/admin-google-drive";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);

  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const serviceAccountMode = isGoogleServiceAccountConfigured();
  if (serviceAccountMode) {
    return NextResponse.json({
      ok: true,
      configured: true,
      schemaReady: true,
      connected: true,
      authMode: "service_account",
      accountEmail: String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim() || null,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      lastConnectedAt: null,
      lastUsedAt: null,
      lastError: null,
    });
  }

  const { data, error } = await admin.client
    .from("admin_integrations")
    .select(
      "provider,status,account_email,granted_scopes,last_connected_at,last_used_at,last_error",
    )
    .eq("provider", "google_drive")
    .maybeSingle();

  if (error) {
    const missingTable = error.message.toLowerCase().includes("admin_integrations");
    return NextResponse.json({
      ok: true,
      configured: Boolean(
        process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET &&
          process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
      ),
      authMode: "oauth",
      schemaReady: !missingTable,
      connected: false,
      accountEmail: null,
      error: missingTable ? "schema_not_applied" : error.message,
    });
  }

  return NextResponse.json({
    ok: true,
    configured: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
    ),
    schemaReady: true,
    connected: data?.status === "connected",
    authMode: "oauth",
    accountEmail: data?.account_email || null,
    scopes: data?.granted_scopes || [],
    lastConnectedAt: data?.last_connected_at || null,
    lastUsedAt: data?.last_used_at || null,
    lastError: data?.last_error || null,
  });
}
