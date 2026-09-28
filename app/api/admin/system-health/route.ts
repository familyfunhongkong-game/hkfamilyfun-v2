import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function configured(value: string | undefined) {
  return Boolean(value && value.trim());
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!url || !anon || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await client.rpc("is_platform_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const checks = {
    supabase: {
      ready:
        configured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      label: "Supabase",
      detail: "Database/Auth public runtime configuration",
    },
    resend: {
      ready:
        configured(process.env.RESEND_API_KEY) &&
        configured(process.env.APPROVAL_EMAIL),
      label: "Resend",
      detail: "Merchant/Admin transactional notifications",
    },
    googleCalendar: {
      ready:
        configured(process.env.GOOGLE_CLIENT_ID) &&
        configured(process.env.GOOGLE_CLIENT_SECRET) &&
        configured(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY) &&
        configured(process.env.GOOGLE_REDIRECT_URI),
      label: "Google Calendar",
      detail: "Planner Free/Busy OAuth integration",
    },
    siteUrl: {
      ready:
        configured(process.env.NEXT_PUBLIC_SITE_URL) ||
        configured(process.env.SITE_URL) ||
        configured(process.env.VERCEL_URL),
      label: "Site URL",
      detail: "Links used in system-generated notifications",
    },
  };

  const readyCount = Object.values(checks).filter((item) => item.ready).length;

  return NextResponse.json({
    ok: true,
    readyCount,
    totalChecks: Object.keys(checks).length,
    allReady: readyCount === Object.keys(checks).length,
    checks,
  });
}
