import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isGoogleServiceAccountConfigured } from "@/lib/admin-google-drive";

export const runtime = "nodejs";

function configured(value: string | undefined) {
  return Boolean(value && value.trim());
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!url || !anon || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await client.rpc("is_platform_admin");
  if (isAdmin !== true) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const dataHubProbe = await client
    .from("external_data_sources")
    .select("id", { count: "exact", head: true });

  const driveProbe = await client
    .from("admin_integrations")
    .select("status,account_email,last_used_at,last_error")
    .eq("provider", "google_drive")
    .maybeSingle();

  const googleBaseReady =
    configured(process.env.GOOGLE_CLIENT_ID) &&
    configured(process.env.GOOGLE_CLIENT_SECRET) &&
    configured(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  const googleServiceAccountReady = isGoogleServiceAccountConfigured();
  const googleOAuthDriveReady =
    googleBaseReady &&
    configured(process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI) &&
    driveProbe.data?.status === "connected";

  const checks = {
    supabase: {
      required: true,
      ready:
        configured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        (configured(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
          configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
      label: "Supabase",
      detail: "Database / Auth runtime configuration",
    },
    dataHub: {
      required: true,
      ready: !dataHubProbe.error,
      label: "Admin Data Hub",
      detail: dataHubProbe.error
        ? "Data Hub schema 未就緒：" + dataHubProbe.error.message
        : "Intake / sync / reporting schema ready",
    },
    googleDrive: {
      required: true,
      ready: googleServiceAccountReady || googleOAuthDriveReady,
      label: "Google Sheets Sync",
      detail: googleServiceAccountReady
        ? "Service Account（長期自動同步）"
        : googleOAuthDriveReady
          ? "OAuth Connected（測試 / 備用）" +
            (driveProbe.data?.account_email ? " · " + driveProbe.data.account_email : "")
          : !googleBaseReady || !configured(process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI)
            ? "Google Sheets integration 尚未設定完整"
            : "OAuth 已設定，但 Admin 尚未完成授權",
    },
    googleCalendar: {
      required: true,
      ready: googleBaseReady,
      label: "Google Calendar",
      detail: googleBaseReady
        ? "Planner Free/Busy runtime ready · callback defaults to /api/google-calendar/callback"
        : "Google Calendar OAuth client configuration incomplete",
    },
    aiAutomation: {
      required: false,
      ready: configured(process.env.OPENAI_API_KEY),
      label: "Generative AI",
      detail: configured(process.env.OPENAI_API_KEY)
        ? "AI normalization / social drafting available"
        : "未設定 AI provider；系統會安全使用 rule-based / template fallback，不會停工",
    },
    resend: {
      required: true,
      ready:
        configured(process.env.RESEND_API_KEY) &&
        configured(process.env.APPROVAL_EMAIL),
      label: "Email / Resend",
      detail: "Merchant / Admin transactional notifications",
    },
    siteUrl: {
      required: true,
      ready:
        configured(process.env.NEXT_PUBLIC_SITE_URL) ||
        configured(process.env.NEXT_PUBLIC_APP_URL) ||
        configured(process.env.SITE_URL) ||
        configured(process.env.VERCEL_URL),
      label: "Site URL",
      detail: "Links used in system-generated notifications and OAuth callbacks",
    },
  };

  const values = Object.values(checks);
  const readyCount = values.filter((item) => item.ready).length;
  const requiredChecks = values.filter((item) => item.required);
  const requiredReadyCount = requiredChecks.filter((item) => item.ready).length;
  const optionalChecks = values.filter((item) => !item.required);
  const optionalReadyCount = optionalChecks.filter((item) => item.ready).length;

  return NextResponse.json({
    ok: true,
    readyCount,
    totalChecks: values.length,
    requiredReadyCount,
    requiredTotalChecks: requiredChecks.length,
    optionalReadyCount,
    optionalTotalChecks: optionalChecks.length,
    allReady: requiredReadyCount === requiredChecks.length,
    checks,
  });
}
