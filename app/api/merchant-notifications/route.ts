import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { merchantNotificationEmailHtml } from "@/lib/merchant-notification-email";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
// Server-only key: used ONLY after the authenticated owner/admin checks below.
// Never expose this key to a browser or NEXT_PUBLIC_ environment variable.
const SERVER_DB_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";
const auditClient =
  SUPABASE_URL && SERVER_DB_KEY
    ? createClient(SUPABASE_URL, SERVER_DB_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
const APPROVAL_EMAIL = process.env.APPROVAL_EMAIL || "info@hkfamilyfun.com";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.SITE_URL ||
  "https://www.hkfamilyfun.com";

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
  html?: string,
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
      ...(html ? { html } : {}),
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
  dedupe_key?: string | null;
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

    if (error?.code === "23505" && notification.dedupe_key) {
      // The admin queue is intentionally invisible to merchant RLS.
      // A unique-key collision confirms that this exact notification was queued,
      // even though this merchant cannot read back the queue row.
      return {
        queued: true,
        queue_id: null as string | null,
        queue_error: null as string | null,
        duplicate: true,
      };
    }

    if (error || !data?.id) {
      return {
        queued: false,
        queue_id: null as string | null,
        queue_error: error?.message || "Notification queue insert failed",
        duplicate: false,
      };
    }

    return {
      queued: true,
      queue_id: String(data.id),
      queue_error: null as string | null,
      duplicate: false,
    };
  }

  async function markEmailResult(
    queueId: string | null,
    result: { sent: boolean; reason?: string },
  ) {
    if (!queueId) return;
    // A merchant is allowed to enqueue an admin notification, but not to
    // UPDATE it under RLS. Use a server-only privileged client for audit.
    if (!auditClient) {
      console.warn("Email send result could not be audited: server DB key missing.");
      return;
    }
    const { error } = await auditClient
      .from("platform_notifications")
      .update({
        email_sent: result.sent,
        email_error: result.sent ? null : result.reason || "Email was not sent",
      })
      .eq("id", queueId);
    if (error) console.error("Email audit update failed:", error.message);
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

    const businessName = String(merchant.business_name || "未命名商戶")
      .replace(/[\r\n]/g, " ").trim().slice(0, 120);
    const adminUrl = new URL("/admin/merchants", SITE_URL);
    adminUrl.searchParams.set("merchant_id", merchant.id);
    const merchantUrl = new URL("/merchant/dashboard", SITE_URL).toString();
    const version = merchant.updated_at || merchant.created_at || "unknown";
    const subject = `🔔【HK Family Fun】新商戶待審批：${businessName}`;
    const message = [
      "有新商戶完成登記，請登入 Admin 審核申請。",
      "",
      `商戶：${businessName}`,
      merchant.contact_name ? `聯絡人：${merchant.contact_name}` : "",
      merchant.contact_email ? `電郵：${merchant.contact_email}` : "",
      "狀態：待審批",
      "",
      `查看及審批：${adminUrl.toString()}`,
      "此連結只會開啟受權限保護的商戶紀錄，不會自動批准。",
    ].filter(Boolean).join("\n");
    const adminHtml = merchantNotificationEmailHtml({
      heading: "🔔 有新商戶等你審批",
      intro: "有新商戶完成登記，請核對商戶資料、條款及私隱同意紀錄，再決定是否批准。",
      details: [
        { label: "商戶名稱", value: businessName },
        { label: "聯絡人", value: merchant.contact_name || "" },
        { label: "聯絡電郵", value: merchant.contact_email || "" },
        { label: "狀態", value: "待審批" },
      ],
      actionLabel: "🔐 查看及審批商戶",
      actionUrl: adminUrl.toString(),
      note: "需要 HK Family Fun Admin 登入。撳連結唔會自動批准，所有決定仍須管理員確認。",
    });

    const adminKey = `merchant-review-${merchant.id}-${version}`;
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
      dedupe_key: adminKey,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }
    if (queued.duplicate) {
      return json({
        queued: true,
        queue_id: queued.queue_id,
        duplicate: true,
        sent: false,
        reason: "Already queued; duplicate email suppressed",
      });
    }

    const adminResult = await sendMail(
      APPROVAL_EMAIL,
      subject,
      message,
      adminKey,
      adminHtml,
    );
    await markEmailResult(queued.queue_id, adminResult);

    // A social-login security notice is sent by Google, not by our app.
    // Send a separate HK Family Fun receipt to the signed-in merchant's
    // verified email, never to an arbitrary address from request JSON.
    let merchantReceipt: { sent: boolean; reason?: string } = {
      sent: false,
      reason: "Merchant email not verified or differs from account email",
    };
    const merchantEmail = String(user.email || "").trim().toLowerCase();
    const contactEmail = String(merchant.contact_email || "").trim().toLowerCase();
    if (merchantEmail && merchantEmail === contactEmail) {
      const receiptSubject = "🎉【HK Family Fun】已收到你嘅商戶申請｜審批中";
      const receiptMessage = [
        `${merchant.contact_name || "商戶"}，你好！`,
        "",
        "🎉 多謝你登記 HK Family Fun！我哋已收到你嘅商戶申請。",
        `商戶：${businessName}`,
        "申請狀態：審批中",
        "✅ 唔需要重複提交申請。平台完成審批後會再以電郵通知你。",
        "",
        `查看商戶中心：${merchantUrl}`,
      ].join("\n");
      const receiptHtml = merchantNotificationEmailHtml({
        heading: "🎉 商戶申請已收到！",
        intro: "多謝你登記 HK Family Fun！我哋已收到你嘅商戶資料，正等待平台審批。完成審批後會再以電郵通知你。",
        details: [
          { label: "商戶名稱", value: businessName },
          { label: "申請狀態", value: "✅ 已收到 · 審批中" },
        ],
        actionLabel: "查看商戶中心",
        actionUrl: merchantUrl,
        note: "暫時唔需要重複登記。平台批准前，活動唔會自動公開。",
      });
      const receiptKey = `merchant-receipt-${merchant.id}-${version}`;
      let receiptQueueId: string | null = null;
      let receiptCanSend = true;

      if (auditClient) {
        const { data: receiptQueue, error: receiptQueueError } = await auditClient
          .from("platform_notifications")
          .insert({
            kind: action,
            recipient_scope: "merchant",
            actor_user_id: user.id,
            merchant_id: merchant.id,
            event_id: null,
            title: receiptSubject,
            message: receiptMessage,
            status_snapshot: merchant.status,
            email_to: merchantEmail,
            dedupe_key: receiptKey,
          })
          .select("id")
          .single();

        if (receiptQueueError) {
          receiptCanSend = false;
          merchantReceipt = {
            sent: false,
            reason: receiptQueueError.code === "23505"
              ? "Merchant receipt already queued; duplicate suppressed"
              : "Merchant receipt queue failed",
          };
        } else {
          receiptQueueId = receiptQueue?.id || null;
        }
      }
      if (receiptCanSend) {
        merchantReceipt = await sendMail(
          merchantEmail,
          receiptSubject,
          receiptMessage,
          receiptKey,
          receiptHtml,
        );
        await markEmailResult(receiptQueueId, merchantReceipt);
      }
    }

    return json({
      ...adminResult,
      queued: true,
      queue_id: queued.queue_id,
      duplicate: false,
      merchant_receipt_sent: merchantReceipt.sent,
      merchant_receipt_reason: merchantReceipt.reason || null,
    });
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
      dedupe_key: `event-submitted-${event.id}-${event.updated_at || "unknown"}`,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }

    if (queued.duplicate) {
      return json({ queued: true, queue_id: queued.queue_id, duplicate: true, sent: false, reason: "Already queued; duplicate email suppressed" });
    }

    const result = await sendMail(
      APPROVAL_EMAIL,
      subject,
      message,
      `event-submitted-${event.id}-${event.updated_at || "unknown"}`,
    );
    await markEmailResult(queued.queue_id, result);

    return json({
      ...result,
      queued: true,
      queue_id: queued.queue_id,
      duplicate: queued.duplicate,
    });
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

    if (!merchant) {
      return json({ error: "Merchant unavailable" }, 404);
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
      email_to: merchant.contact_email || null,
      dedupe_key: `event-status-${event.id}-${event.status}-${event.updated_at || "unknown"}`,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }

    if (queued.duplicate) {
      return json({ queued: true, queue_id: queued.queue_id, duplicate: true, sent: false, reason: "Already queued; duplicate email suppressed" });
    }

    const result = merchant.contact_email
      ? await sendMail(
          merchant.contact_email,
          subject,
          message,
          `event-status-${event.id}-${event.status}-${event.updated_at || "unknown"}`,
        )
      : { sent: false, reason: "Merchant email unavailable" };
    await markEmailResult(queued.queue_id, result);

    return json({
      ...result,
      queued: true,
      queue_id: queued.queue_id,
      duplicate: queued.duplicate,
    });
  }

  if (action === "merchant_status_changed") {
    if (!body.merchant_id) return json({ error: "Missing merchant_id" }, 400);

    const { data: merchant } = await client
      .from("merchants")
      .select("business_name,contact_email,status,rejection_reason,updated_at")
      .eq("id", body.merchant_id)
      .maybeSingle();

    if (!merchant) {
      return json({ error: "Merchant unavailable" }, 404);
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
      email_to: merchant.contact_email || null,
      dedupe_key: `merchant-status-${body.merchant_id}-${merchant.status}-${merchant.updated_at || "unknown"}`,
    });

    if (!queued.queued) {
      return json(
        { error: "Notification queue failed.", reason: queued.queue_error },
        500,
      );
    }

    if (queued.duplicate) {
      return json({ queued: true, queue_id: queued.queue_id, duplicate: true, sent: false, reason: "Already queued; duplicate email suppressed" });
    }

    const result = merchant.contact_email
      ? await sendMail(
          merchant.contact_email,
          subject,
          message,
          `merchant-status-${body.merchant_id}-${merchant.status}-${merchant.updated_at || "unknown"}`,
        )
      : { sent: false, reason: "Merchant email unavailable" };
    await markEmailResult(queued.queue_id, result);

    return json({
      ...result,
      queued: true,
      queue_id: queued.queue_id,
      duplicate: queued.duplicate,
    });
  }

  return json({ error: "Unsupported action" }, 400);
}
