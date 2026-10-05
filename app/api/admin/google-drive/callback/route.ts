import { NextRequest, NextResponse } from "next/server";
import { encryptAdminGoogleToken } from "@/lib/admin-google-drive";
import { requireAdmin, serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";

function redirect(request: NextRequest, state: string) {
  const response = NextResponse.redirect(
    new URL("/admin/operations?drive=" + encodeURIComponent(state), request.nextUrl.origin),
  );
  response.cookies.delete("hkff_admin_drive_state");
  response.cookies.delete("hkff_admin_drive_redirect");
  response.cookies.delete("hkff_admin_drive_access_token");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("hkff_admin_drive_state")?.value;
  const savedRedirect = request.cookies.get("hkff_admin_drive_redirect")?.value;
  const adminAccessToken = request.cookies.get("hkff_admin_drive_access_token")?.value;

  if (!code || !state || !savedState || state !== savedState || !savedRedirect) {
    return redirect(request, "state-error");
  }

  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    return redirect(request, "not-configured");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: savedRedirect,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return redirect(request, "token-error");
  }

  const token = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
  };

  if (!token.access_token || !token.refresh_token) {
    return redirect(request, "refresh-token-missing");
  }

  let accountEmail = "";
  try {
    const userInfoResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: "Bearer " + token.access_token },
        cache: "no-store",
      },
    );

    if (userInfoResponse.ok) {
      const userInfo = (await userInfoResponse.json()) as { email?: string };
      accountEmail = String(userInfo.email || "").trim().toLowerCase();
    }
  } catch {
    accountEmail = "";
  }

  const allowedEmail = String(
    process.env.GOOGLE_ADMIN_DRIVE_ALLOWED_EMAIL || "",
  ).trim().toLowerCase();

  if (allowedEmail && accountEmail !== allowedEmail) {
    console.error(
      "Google Drive authorization rejected for unexpected account:",
      accountEmail || "unknown",
    );
    return redirect(request, "wrong-account");
  }

  let adminClient = null;

  if (adminAccessToken) {
    const authenticatedAdmin = await requireAdmin(adminAccessToken);
    if (authenticatedAdmin.ok) {
      adminClient = authenticatedAdmin.client;
    }
  }

  if (!adminClient) {
    adminClient = serviceClient();
  }

  if (!adminClient) {
    console.error("Google Drive callback has no usable Supabase Admin client");
    return redirect(request, "database-not-configured");
  }

  const now = new Date().toISOString();
  const { error } = await adminClient.from("admin_integrations").upsert(
    {
      provider: "google_drive",
      status: "connected",
      account_email: accountEmail || null,
      encrypted_refresh_token: encryptAdminGoogleToken(token.refresh_token),
      granted_scopes: String(token.scope || "")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean),
      last_connected_at: now,
      last_used_at: now,
      last_error: null,
      updated_at: now,
    },
    { onConflict: "provider" },
  );

  if (error) {
    console.error("Google Drive integration save failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return redirect(request, "database-error");
  }

  console.info("Google Drive integration connected", {
    accountEmail: accountEmail || null,
    scopes: String(token.scope || "").split(/\s+/).filter(Boolean),
    usedAuthenticatedAdminSession: Boolean(adminAccessToken),
  });

  return redirect(request, "connected");
}
