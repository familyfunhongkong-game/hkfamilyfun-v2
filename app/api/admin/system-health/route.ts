import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isGoogleServiceAccountConfigured } from "@/lib/admin-google-drive";
import { HK_FAMILY_FUN_BUSINESS_MODEL } from "@/lib/business-model";
import {
  CURRENT_MERCHANT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from "@/lib/merchant-legal";

export const runtime = "nodejs";

function configured(value: string | undefined) {
  return Boolean(value && value.trim());
}

function normalizeUrl(value: string | undefined) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function hongKongToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

  const promotionAnalyticsProbe = await client
    .from("promotion_events")
    .select("id", { count: "exact", head: true });

  const merchantLegalProbe = await client
    .from("merchants")
    .select(
      "id,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at",
    )
    .eq("status", "approved");

  const driveProbe = await client
    .from("admin_integrations")
    .select("status,account_email,last_used_at,last_error")
    .eq("provider", "google_drive")
    .maybeSingle();

  const publishedProbe = await client
    .from("events")
    .select(
      "id,title_tc,title,start_date,end_date,cover_image_url,gallery_image_urls,published_at",
    )
    .eq("status", "published");

  const today = hongKongToday();
  const publishedRows = publishedProbe.data || [];
  const missingImageRows = publishedRows.filter((event) => {
    const cover = String(event.cover_image_url || "").trim();
    const gallery = Array.isArray(event.gallery_image_urls)
      ? event.gallery_image_urls.filter((value) => String(value || "").trim())
      : [];
    return !cover && gallery.length === 0;
  });
  const currentFutureMissingImageRows = missingImageRows.filter((event) => {
    const lastDate = String(event.end_date || event.start_date || "").trim();
    return Boolean(lastDate && lastDate >= today);
  });
  const missingPublishedAtRows = publishedRows.filter(
    (event) => !event.published_at,
  );

  const contentQuality = {
    queryReady: !publishedProbe.error,
    publishedTotal: publishedRows.length,
    missingImage: missingImageRows.length,
    currentFutureMissingImage: currentFutureMissingImageRows.length,
    missingPublishedAt: missingPublishedAtRows.length,
    currentFutureMissingImageItems: currentFutureMissingImageRows
      .slice(0, 8)
      .map((event) => ({
        id: event.id,
        title: String(event.title_tc || event.title || "未命名活動"),
        startDate: event.start_date,
        endDate: event.end_date,
      })),
  };

  const googleBaseReady =
    configured(process.env.GOOGLE_CLIENT_ID) &&
    configured(process.env.GOOGLE_CLIENT_SECRET) &&
    configured(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  const googleServiceAccountReady = isGoogleServiceAccountConfigured();
  const googleOAuthDriveReady =
    googleBaseReady &&
    configured(process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI) &&
    driveProbe.data?.status === "connected";

  const canonicalLiveUrl = "https://www.hkfamilyfun.com";
  const canonicalApiUrl = canonicalLiveUrl + "/api";
  const liveDriveCallback =
    canonicalLiveUrl + "/api/admin/google-drive/callback";
  const runtimeHost = request.nextUrl.hostname.toLowerCase();
  const runtimeMode =
    runtimeHost === "www.hkfamilyfun.com" || runtimeHost === "hkfamilyfun.com"
      ? "live"
      : "staging";

  const cutover = {
    runtimeMode,
    runtimeHost,
    canonicalLiveUrl,
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    siteUrlLive:
      normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) === canonicalLiveUrl,
    appUrlLive:
      normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) === canonicalLiveUrl,
    apiUrlLive:
      normalizeUrl(process.env.NEXT_PUBLIC_API_URL) === canonicalApiUrl,
    adminDriveCallbackLive:
      normalizeUrl(process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI) ===
      liveDriveCallback,
    calendarCallbackMode: configured(process.env.GOOGLE_REDIRECT_URI)
      ? "explicit"
      : "request-origin",
  };

  const cutoverConfigReady =
    cutover.siteUrlLive &&
    cutover.appUrlLive &&
    cutover.apiUrlLive &&
    cutover.adminDriveCallbackLive;

  const merchantLegalRows = merchantLegalProbe.data || [];
  const merchantsNeedingLegalRefresh = merchantLegalRows.filter(
    (merchant) =>
      merchant.terms_version !== CURRENT_MERCHANT_TERMS_VERSION ||
      !merchant.terms_accepted_at ||
      merchant.privacy_version !== CURRENT_PRIVACY_VERSION ||
      !merchant.privacy_accepted_at,
  ).length;

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
    scheduledAutomation: {
      required: true,
      ready: configured(process.env.CRON_SECRET),
      label: "Scheduled Automation",
      detail: configured(process.env.CRON_SECRET)
        ? "每日香港時間 00:30 Google Sheets sync · 01:30 自動封存明確過期非 recurring 活動"
        : "CRON_SECRET 未設定；每日自動同步 / 資料清理未受保護",
    },
    promotionAnalytics: {
      required: false,
      ready: !promotionAnalyticsProbe.error,
      label: "Promotion Analytics",
      detail: promotionAnalyticsProbe.error
        ? "Banner analytics schema 未就緒"
        : "Admin 可睇近30日 impressions / clicks / CTR；不儲存 user id、email 或 IP",
    },
    googleServiceAccount: {
      required: false,
      ready: googleServiceAccountReady,
      label: "Google Service Account",
      detail: googleServiceAccountReady
        ? "長期 Google Sheets 自動同步已使用 Service Account"
        : "未設定；目前使用 OAuth 測試 / 備用模式，正式長期營運仍建議完成 Service Account",
    },
    googleCalendar: {
      required: false,
      ready: googleBaseReady,
      label: "Google Calendar",
      detail: googleBaseReady
        ? "Optional Planner Free/Busy integration ready · callback defaults to /api/google-calendar/callback"
        : "Optional Free/Busy integration unavailable; Planner core still works",
    },
    aiAutomation: {
      required: false,
      ready: configured(process.env.OPENAI_API_KEY),
      label: "Generative AI",
      detail: configured(process.env.OPENAI_API_KEY)
        ? "AI normalization / social drafting available"
        : "未設定 AI provider；系統會安全使用 rule-based / template fallback，不會停工",
    },
    merchantLegalAcceptance: {
      required: true,
      ready:
        configured(process.env.SUPABASE_SECRET_KEY) ||
        configured(process.env.SUPABASE_SERVICE_KEY),
      label: "Merchant Legal Acceptance",
      detail:
        configured(process.env.SUPABASE_SECRET_KEY) ||
        configured(process.env.SUPABASE_SERVICE_KEY)
          ? "Server-only legal acceptance endpoint ready；Service/Secret key 不會送到 browser"
          : "缺少 server-only Supabase admin credential；舊商戶無法保存新版 Terms / Privacy 接受記錄",
    },
    merchantTermsCompliance: {
      required: false,
      ready:
        !merchantLegalProbe.error && merchantsNeedingLegalRefresh === 0,
      label: "Merchant Terms Compliance",
      detail: merchantLegalProbe.error
        ? "未能檢查已批准商戶的 Terms / Privacy version"
        : merchantsNeedingLegalRefresh === 0
          ? "全部已批准商戶已使用目前 Terms / Privacy version"
          : `${merchantsNeedingLegalRefresh} 個已批准商戶需要在使用付費推廣前重新接受目前 Terms / Privacy；免費活動 Listing 不受影響`,
    },
    merchantAdvertising: {
      required: true,
      ready:
        configured(process.env.RESEND_API_KEY) &&
        configured(process.env.APPROVAL_EMAIL),
      label: "Merchant Advertising",
      detail:
        configured(process.env.RESEND_API_KEY) &&
        configured(process.env.APPROVAL_EMAIL)
          ? "一般活動 Listing 免費；付費 Banner / Featured / Sponsored 查詢可由 Merchant Portal 提交，付款仍由 Admin 確認後才可啟用"
          : "廣告查詢通知未完整設定；一般免費活動 Listing 不受影響",
    },
    sellWithFamilyFunSafety: {
      required: true,
      ready:
        !HK_FAMILY_FUN_BUSINESS_MODEL.sellWithFamilyFunRequested ||
        (HK_FAMILY_FUN_BUSINESS_MODEL.sellWithFamilyFunImplemented &&
          HK_FAMILY_FUN_BUSINESS_MODEL.sellWithFamilyFunEnabled),
      label: "Sell with Family Fun Safety Gate",
      detail: HK_FAMILY_FUN_BUSINESS_MODEL.sellWithFamilyFunEnabled
        ? "Code gate + environment gate 已同時開啟"
        : HK_FAMILY_FUN_BUSINESS_MODEL.sellWithFamilyFunRequested
          ? "環境變數要求開啟，但 checkout / refund / payout backend 尚未完成；系統已阻止啟用"
          : "Safely OFF：現階段由主辦方自行處理報名付款；待完整 ticketing backend QA 後先可開啟",
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
    cutover: {
      ...cutover,
      configReady: cutoverConfigReady,
      liveServingRebuild: runtimeMode === "live",
    },
    contentQuality,
    checks,
  });
}
