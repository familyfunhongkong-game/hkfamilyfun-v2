import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const APPROVAL_EMAIL = process.env.APPROVAL_EMAIL || "info@hkfamilyfun.com";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://hkfamilyfun-v2.vercel.app";

type Action =
  | "merchant_registered"
  | "event_submitted"
  | "event_status_changed"
  | "merchant_status_changed";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function sendMail(
  to: string,
  subject: string,
  text: string,
  idempotencyKey: string,
) {
  if (!RESEND_API_KEY) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: "HK Family Fun <no-reply@hkfamilyfun.com>",
      to: [to],
      reply_to: "info@hkfamilyfun.com",
      subject,
      text,
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

type NotificationInsert = {
  kind: Action;
  recipient_scope: "admin" | "merchant";
  actor_user_id: string;
  merchant_id?: string | null;
  event_id?: string | null;
  title: string;
  message?: string | null;
  status_snapshot?: string | null;
  email_to?: string | null;
};

export async function POST(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: "Supabase environment is not configured." }, 500);
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) return json({ error: "Unauthorized" }, 401);

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function queueNotification(notification: NotificationInsert) {
    const { data, error } = await client
      .from("platform_notifications")
      .insert(notification)
      .select("id")
      .single();

    if (error || !data?.id) {
      return {
        queued: false,
        queue_id: null as string | null,
        queue_error: error?.message || "Notification queue insert failed",
      };
    }

    return {
      queued: true,
      queue_id: String(data.id),
      queue_error: null as string | null,
    };
  }

  async function markEmailResult(
    queueId: string | null,
    result: { sent: boolean; reason?: string },
  ) {
    if (!queueId) return;

    await client
      .from("platform_notifications")
      .update({
        email_sent: result.sent,
        email_error: result.sent ? null : result.reason || "Email was not sent",
      })
      .eq("id", queueId);
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const body = (await request.json()) as {
    action?: Action;
    event_id?: string;
    merchant_id?: string;
    status?: string;
  };

  const action = body.action;
  if (!action) return json({ error: "Missing action" }, 400);

  if (action === "merchant_registered") {
    if (!body.merchant_id) return json({ error: "Missing merchant_id" }, 400);

    const { data: merchant, error } = await client
      .from("merchants")
      .select("id,business_name,contact_name,contact_email,status,created_at,updated_at,owner_user_id")
      .eq("id", body.merchant_id)
      .maybeSingle();

    if (
      error ||
      !merchant ||
      merchant.owner_user_id !== user.id ||
      merchant.status !== "pending"
    ) {
      return json({ error: "Merchant is unavailable or not pending." }, 403);
    }

    const subject = `HK Family Fun｜新商戶待審批：${merchant.business_name || "未命名商戶"}`;
    const message = [
      "有新商戶完成註冊並等待平台審批。",
      "",
      `商戶：${merchant.business_name || "未命名商戶"}`,
      merchant.contact_name ? `聯絡人：${merchant.contact_name}` : "",
      merchant.contact_email ? `Email：${merchant.contact_email}` : "",
      "",
      `Admin：${SITE_URL}/admin/merchants`,
    ].filter(Boolean).join("\n");

    const queued = await queueNotification({
      kind: action,
      recipient_scope: "admin",
      actor_user_id: user.id,
      merchant_id: merchant.id,
      event_id: null,
      title: subject,
      message,
      status_snapshot: merchant.status,
      email_to: APPROVAL_EMAIL,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }

    const result = await sendMail(
      APPROVAL_EMAIL,
      subject,
      message,
      `merchant-review-${merchant.id}-${merchant.updated_at || merchant.created_at || "unknown"}`,
    );

    return json({ ...result, queued: true, queue_id: queued.queue_id });
  }

  if (action === "event_submitted") {
    if (!body.event_id) return json({ error: "Missing event_id" }, 400);

    const { data: event, error } = await client
      .from("events")
      .select("id,title_tc,status,merchant_id,updated_at")
      .eq("id", body.event_id)
      .maybeSingle();

    if (error || !event || event.status !== "submitted") {
      return json({ error: "Event is unavailable or not submitted." }, 403);
    }

    const { data: merchant } = await client
      .from("merchants")
      .select("id,owner_user_id")
      .eq("id", event.merchant_id)
      .maybeSingle();

    if (!merchant || merchant.owner_user_id !== user.id) {
      return json({ error: "Event merchant ownership check failed." }, 403);
    }

    const subject = `HK Family Fun｜新活動待審批：${event.title_tc || "未命名活動"}`;
    const message = [
      "有商戶提交新活動等待審批。",
      "",
      `活動：${event.title_tc || "未命名活動"}`,
      `Admin：${SITE_URL}/admin/events`,
      "",
      "活動在管理員發布前不會公開。",
    ].join("\n");

    const queued = await queueNotification({
      kind: action,
      recipient_scope: "admin",
      actor_user_id: user.id,
      merchant_id: event.merchant_id,
      event_id: event.id,
      title: subject,
      message,
      status_snapshot: event.status,
      email_to: APPROVAL_EMAIL,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }

    const result = await sendMail(
      APPROVAL_EMAIL,
      subject,
      message,
      `event-submitted-${event.id}-${event.updated_at || "unknown"}`,
    );

    return json({ ...result, queued: true, queue_id: queued.queue_id });
  }

  const { data: isAdmin } = await client.rpc("is_platform_admin");
  if (!isAdmin) return json({ error: "Admin access required." }, 403);

  if (action === "event_status_changed") {
    if (!body.event_id) return json({ error: "Missing event_id" }, 400);

    const { data: event } = await client
      .from("events")
      .select("id,title_tc,status,merchant_id,rejection_reason,updated_at")
      .eq("id", body.event_id)
      .maybeSingle();

    if (!event?.merchant_id) return json({ sent: false, reason: "No merchant owner" });

    const { data: merchant } = await client
      .from("merchants")
      .select("contact_email,business_name")
      .eq("id", event.merchant_id)
      .maybeSingle();

    if (!merchant?.contact_email) {
      return json({ sent: false, reason: "Merchant email unavailable" });
    }

    const label =
      event.status === "published"
        ? "已發布"
        : event.status === "approved"
          ? "已批准，等待發布"
          : event.status === "rejected"
            ? "需要修改"
            : event.status === "archived"
              ? "已封存"
              : event.status;

    const subject = `HK Family Fun｜活動狀態更新：${event.title_tc || "活動"}`;
    const message = [
      `${merchant.business_name || "商戶"}你好：`,
      "",
      `活動：${event.title_tc || "未命名活動"}`,
      `最新狀態：${label}`,
      event.rejection_reason ? `平台備註：${event.rejection_reason}` : "",
      "",
      `Merchant Portal：${SITE_URL}/merchant/dashboard`,
    ].filter(Boolean).join("\n");

    const queued = await queueNotification({
      kind: action,
      recipient_scope: "merchant",
      actor_user_id: user.id,
      merchant_id: event.merchant_id,
      event_id: event.id,
      title: subject,
      message,
      status_snapshot: event.status,
      email_to: merchant.contact_email,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }

    const result = await sendMail(
      merchant.contact_email,
      subject,
      message,
      `event-status-${event.id}-${event.status}-${event.updated_at || "unknown"}`,
    );
    await markEmailResult(queued.queue_id, result);

    return json({ ...result, queued: true, queue_id: queued.queue_id });
  }

  if (action === "merchant_status_changed") {
    if (!body.merchant_id) return json({ error: "Missing merchant_id" }, 400);

    const { data: merchant } = await client
      .from("merchants")
      .select("business_name,contact_email,status,rejection_reason,updated_at")
      .eq("id", body.merchant_id)
      .maybeSingle();

    if (!merchant?.contact_email) {
      return json({ sent: false, reason: "Merchant email unavailable" });
    }

    const label =
      merchant.status === "approved"
        ? "已批准"
        : merchant.status === "rejected"
          ? "需要修改"
          : merchant.status === "suspended"
            ? "已暫停"
            : "審批中";

    const subject = `HK Family Fun｜商戶帳戶狀態：${label}`;
    const message = [
      `${merchant.business_name || "商戶"}你好：`,
      "",
      `商戶帳戶最新狀態：${label}`,
      merchant.rejection_reason ? `平台備註：${merchant.rejection_reason}` : "",
      "",
      merchant.status === "approved"
        ? `你現在可以登入 Merchant Portal 建立及提交活動：${SITE_URL}/merchant/login`
        : `Merchant Portal：${SITE_URL}/merchant/login`,
    ].filter(Boolean).join("\n");

    const queued = await queueNotification({
      kind: action,
      recipient_scope: "merchant",
      actor_user_id: user.id,
      merchant_id: body.merchant_id,
      event_id: null,
      title: subject,
      message,
      status_snapshot: merchant.status,
      email_to: merchant.contact_email,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }

    const result = await sendMail(
      merchant.contact_email,
      subject,
      message,
      `merchant-status-${body.merchant_id}-${merchant.status}-${merchant.updated_at || "unknown"}`,
    );
    await markEmailResult(queued.queue_id, result);

    return json({ ...result, queued: true, queue_id: queued.queue_id });
  }

  return json({ error: "Unsupported action" }, 400);
}
