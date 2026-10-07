import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasCurrentMerchantTerms } from "@/lib/merchant-legal";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const APPROVAL_EMAIL = process.env.APPROVAL_EMAIL || "info@hkfamilyfun.com";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.SITE_URL ||
  "https://hkfamilyfun-v2.vercel.app";

const promotionTypes = new Set([
  "home_banner",
  "events_featured",
  "sponsored_content",
  "other",
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function safeText(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function validHttpUrl(value: string) {
  if (!value) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

async function sendMail(input: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}) {
  if (!RESEND_API_KEY) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: "HK Family Fun <no-reply@hkfamilyfun.com>",
      to: [input.to],
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) {
    return {
      sent: false,
      reason: `Resend HTTP ${response.status}: ${await response.text()}`,
    };
  }

  return { sent: true };
}

function promotionLabel(value: string) {
  if (value === "home_banner") return "首頁 Banner / Hero";
  if (value === "events_featured") return "活動搜尋頁 Featured";
  if (value === "sponsored_content") return "News / Feature Sponsored";
  return "其他合作";
}

function durationLabel(value: string) {
  if (value === "1_week") return "1 星期";
  if (value === "2_weeks") return "2 星期";
  if (value === "1_month") return "1 個月";
  if (value === "discuss") return "想先傾";
  return value;
}

function budgetLabel(value: string) {
  if (value === "under_1000") return "HK$1,000 以下";
  if (value === "1000_3000") return "HK$1,000–3,000";
  if (value === "3000_5000") return "HK$3,000–5,000";
  if (value === "5000_plus") return "HK$5,000+";
  return value;
}

export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: "Account service is not configured." }, 500);
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) return json({ error: "Unauthorized" }, 401);

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  const user = userData.user;

  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: merchant, error: merchantError } = await client
    .from("merchants")
    .select(
      "id,business_name,contact_name,contact_email,status,owner_user_id,terms_version,terms_accepted_at",
    )
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (
    merchantError ||
    !merchant ||
    merchant.owner_user_id !== user.id ||
    merchant.status !== "approved"
  ) {
    return json({ error: "Approved merchant account required." }, 403);
  }

  if (!hasCurrentMerchantTerms(merchant)) {
    return json(
      {
        error:
          "請先在 Merchant Dashboard 閱讀並接受最新 Merchant Terms，再提交付費廣告查詢。",
        code: "CURRENT_MERCHANT_TERMS_REQUIRED",
      },
      409,
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const requestId = safeText(body.request_id, 64);
  const promotionType = safeText(body.promotion_type, 40);
  const campaignName = safeText(body.campaign_name, 120);
  const officialUrl = safeText(body.official_url, 500);
  const preferredStart = safeText(body.preferred_start, 40);
  const duration = safeText(body.duration, 80);
  const budgetRange = safeText(body.budget_range, 80);
  const notes = safeText(body.notes, 2000);

  if (!validUuid(requestId)) {
    return json({ error: "Invalid request ID." }, 400);
  }

  if (!promotionTypes.has(promotionType)) {
    return json({ error: "Please select a valid promotion type." }, 400);
  }

  if (!campaignName) {
    return json({ error: "Campaign / event name is required." }, 400);
  }

  if (!validHttpUrl(officialUrl)) {
    return json({ error: "Official URL must be a valid http/https link." }, 400);
  }

  const merchantEmail = safeText(
    merchant.contact_email || user.email || "",
    320,
  );

  if (!merchantEmail) {
    return json({ error: "Merchant contact email is unavailable." }, 400);
  }

  const adminSubject = `HK Family Fun｜廣告查詢：${merchant.business_name || "商戶"}｜${campaignName}`;
  const adminMessage = [
    "有已批准商戶從 Merchant Portal 提交付費廣告查詢。",
    "",
    `Request ID：${requestId}`,
    `商戶：${merchant.business_name || "未命名商戶"}`,
    merchant.contact_name ? `聯絡人：${merchant.contact_name}` : "",
    `Email：${merchantEmail}`,
    `廣告類型：${promotionLabel(promotionType)}`,
    `Campaign / 活動：${campaignName}`,
    officialUrl ? `官方 / 活動連結：${officialUrl}` : "",
    preferredStart ? `希望開始日期：${preferredStart}` : "",
    duration ? `預計投放期：${durationLabel(duration)}` : "",
    budgetRange ? `預算範圍：${budgetLabel(budgetRange)}` : "",
    notes ? `備註：${notes}` : "",
    "",
    "注意：此查詢並不代表廣告位已預留或付款已確認。",
    `Promotion Manager：${SITE_URL}/admin/promotions`,
  ]
    .filter(Boolean)
    .join("\n");

  const adminResult = await sendMail({
    to: APPROVAL_EMAIL,
    replyTo: merchantEmail,
    subject: adminSubject,
    text: adminMessage,
    idempotencyKey: `advertising-enquiry-admin-${requestId}`,
  });

  if (!adminResult.sent) {
    console.error("advertising-enquiry admin email failed", {
      merchantId: merchant.id,
      requestId,
      reason: adminResult.reason,
    });
    return json(
      {
        error: "Unable to submit advertising enquiry.",
        reason: adminResult.reason,
      },
      502,
    );
  }

  const merchantSubject = "HK Family Fun｜已收到你的付費廣告查詢";
  const merchantMessage = [
    `${merchant.business_name || "商戶"}你好：`,
    "",
    "我哋已收到你的付費廣告 / Featured Promotion 查詢。",
    "",
    `Request ID：${requestId}`,
    `廣告類型：${promotionLabel(promotionType)}`,
    `Campaign / 活動：${campaignName}`,
    "",
    "HK Family Fun 會先確認版位、檔期及收費；收到付款確認後才會安排 Sponsored 廣告上架。",
    "一般活動 Listing 仍然免費，提交這個廣告查詢不會影響你原有活動刊登。",
    "",
    `Merchant Portal：${SITE_URL}/merchant/dashboard`,
    "",
    "HK Family Fun Team",
  ].join("\n");

  const merchantResult = await sendMail({
    to: merchantEmail,
    replyTo: APPROVAL_EMAIL,
    subject: merchantSubject,
    text: merchantMessage,
    idempotencyKey: `advertising-enquiry-merchant-${requestId}`,
  });

  if (!merchantResult.sent) {
    console.error("advertising-enquiry merchant confirmation failed", {
      merchantId: merchant.id,
      requestId,
      reason: merchantResult.reason,
    });
  }

  return json({
    submitted: true,
    request_id: requestId,
    merchant_confirmation_sent: merchantResult.sent,
  });
}
