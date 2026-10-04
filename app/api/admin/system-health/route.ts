import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const checks = {
    supabase: {
      ready:
        configured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        (configured(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
          configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
      label: "Supabase",
      detail: "Database / Auth runtime configuration",
    },
    dataHub: {
      ready: !dataHubProbe.error,
      label: "Admin Data Hub",
      detail: dataHubProbe.error
        ? "Data Hub schema 未就緒：" + dataHubProbe.error.message
        : "Intake / sync / reporting schema ready",
    },
    googleDrive: {
      ready:
        googleBaseReady &&
        configured(process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI) &&
        driveProbe.data?.status === "connected",
      label: "Google Drive / Sheets",
      detail: !googleBaseReady || !configured(process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI)
        ? "網站 OAuth 未設定完整；目前只可由已連接工具做人工/受控同步"
        : driveProbe.data?.status === "connected"
          ? "Connected" + (driveProbe.data.account_email ? " · " + driveProbe.data.account_email : "")
          : "OAuth 已設定，但 Admin 尚未完成 Drive 授權",
    },
    googleCalendar: {
      ready:
        googleBaseReady &&
        configured(process.env.GOOGLE_REDIRECT_URI),
      label: "Google Calendar",
      detail: "Planner Free/Busy OAuth integration",
    },
    aiAutomation: {
      ready: configured(process.env.OPENAI_API_KEY),
      label: "Generative AI",
      detail: configured(process.env.OPENAI_API_KEY)
        ? "AI normalization / social drafting available"
        : "未設定 AI provider；系統會安全使用 rule-based / template fallback，不會停工",
    },
    resend: {
      ready:
        configured(process.env.RESEND_API_KEY) &&
        configured(process.env.APPROVAL_EMAIL),
      label: "Email / Resend",
      detail: "Merchant / Admin transactional notifications",
    },
    siteUrl: {
      ready:
        configured(process.env.NEXT_PUBLIC_SITE_URL) ||
        configured(process.env.NEXT_PUBLIC_APP_URL) ||
        configured(process.env.SITE_URL) ||
        configured(process.env.VERCEL_URL),
      label: "Site URL",
      detail: "Links used in system-generated notifications and OAuth callbacks",
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
