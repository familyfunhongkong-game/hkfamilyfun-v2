"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  kind: string;
  recipient_scope: "admin" | "merchant";
  merchant_id: string | null;
  event_id: string | null;
  title: string;
  message: string | null;
  status_snapshot: string | null;
  email_to: string | null;
  email_sent: boolean;
  email_error: string | null;
  created_at: string;
  read_at: string | null;
};

type MerchantProfile = {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  terms_version: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventProfile = {
  id: string;
  title_tc: string | null;
  status: string;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  start_date: string | null;
  end_date: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
};

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function reviewStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "待審批", approved: "已批准", rejected: "已拒絕", suspended: "已暫停",
    submitted: "待審批", draft: "草稿", published: "已發布", archived: "已封存",
  };
  return labels[status] || status;
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Hong_Kong",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function kindLabel(kind: string) {
  if (kind === "merchant_updated") return "商戶修改";
  if (kind === "event_created") return "新活動草稿";
  if (kind === "event_updated") return "活動修改";
  if (kind === "merchant_registered") return "新商戶";
  if (kind === "event_submitted") return "活動待審";
  if (kind === "event_status_changed") return "活動狀態";
  if (kind === "merchant_status_changed") return "商戶狀態";
  return kind;
}

function MerchantReviewCard({
  merchant, pendingAction, rejectionOpen, rejectionReason, setRejectionReason,
  onRejectToggle, onDecision,
}: {
  merchant: MerchantProfile;
  pendingAction: boolean;
  rejectionOpen: boolean;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  onRejectToggle: () => void;
  onDecision: (status: "approved" | "rejected") => void;
}) {
  const canApprove = merchant.status === "pending" &&
    Boolean(merchant.business_name.trim() && merchant.contact_name?.trim() &&
      merchant.contact_email?.trim() && merchant.terms_accepted_at && merchant.privacy_accepted_at);
  const website = safeExternalUrl(merchant.website_url);
  return (
    <section aria-label="商戶註冊審核摘要" className="mt-4 rounded-2xl border border-purple-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-slate-950">{merchant.business_name || "未填商戶名稱"}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${merchant.status === "pending" ? "bg-amber-100 text-amber-900" : merchant.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
          最新商戶狀態：{reviewStatusLabel(merchant.status)}
        </span>
      </div>
      <dl className="mt-3 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold text-slate-500">聯絡人</dt><dd className="mt-1 break-words font-semibold text-slate-900">{merchant.contact_name || "未填"}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">商戶電郵</dt><dd className="mt-1 break-all text-slate-900">{merchant.contact_email ? <a className="text-purple-800 underline underline-offset-2" href={`mailto:${merchant.contact_email}`}>{merchant.contact_email}</a> : "未填"}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">電話</dt><dd className="mt-1 font-semibold text-slate-900">{merchant.contact_phone || "未填"}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">商戶網站</dt><dd className="mt-1 break-all">{website ? <a href={website} target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-800 underline underline-offset-2">開啟商戶網站 ↗</a> : merchant.website_url || "未填"}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">登記時間</dt><dd className="mt-1 text-slate-900">{merchant.created_at ? formatTime(merchant.created_at) : "未知"}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">最近修改</dt><dd className="mt-1 text-slate-900">{merchant.updated_at ? formatTime(merchant.updated_at) : "未知"}</dd></div>
      </dl>
      {merchant.description ? <div className="mt-3"><h4 className="text-xs font-semibold text-slate-500">商戶簡介</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{merchant.description}</p></div> : null}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className={`rounded-full px-3 py-1 ${merchant.terms_accepted_at ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>商戶條款：{merchant.terms_accepted_at ? "已接受" : "未確認"}{merchant.terms_accepted_at && merchant.terms_version ? ` · ${merchant.terms_version}` : ""}</span>
        <span className={`rounded-full px-3 py-1 ${merchant.privacy_accepted_at ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>私隱政策：{merchant.privacy_accepted_at ? "已接受" : "未確認"}</span>
      </div>
      {merchant.rejection_reason ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">退回原因：{merchant.rejection_reason}</p> : null}
      {merchant.status === "pending" ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          {!canApprove ? <p role="note" className="mb-3 text-xs font-semibold text-amber-800">資料或條款接受記錄未齊，暫不能批准；請到商戶管理頁核對。</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!canApprove || pendingAction} onClick={() => onDecision("approved")} className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">批准商戶</button>
            <button type="button" disabled={pendingAction} onClick={onRejectToggle} aria-expanded={rejectionOpen} className="min-h-11 rounded-xl border border-rose-300 bg-white px-5 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-40">退回修改</button>
            <Link href={`/admin/merchants?merchant_id=${encodeURIComponent(merchant.id)}#merchant-list`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">完整商戶資料 ↗</Link>
          </div>
          {rejectionOpen ? <div className="mt-3 space-y-2">
            <label htmlFor={`rejection-${merchant.id}`} className="block text-sm font-semibold text-slate-700">退回原因（必填，會通知商戶）</label>
            <textarea id={`rejection-${merchant.id}`} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" placeholder="請說明需要補充或修正的資料…" />
            <button type="button" onClick={() => onDecision("rejected")} disabled={pendingAction || !rejectionReason.trim()} className="min-h-11 rounded-xl bg-rose-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-40">確認退回</button>
          </div> : null}
        </div>
      ) : <p className="mt-3 text-xs font-semibold text-slate-500">此商戶已非待審批狀態；通知可能是舊紀錄，毋須重覆審批。</p>}
    </section>
  );
}

function EventPreviewCard({ event }: { event: EventProfile }) {
  return <section className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="text-base font-black text-slate-900">{event.title_tc || "未命名活動"}</h3><span className="text-xs font-bold text-sky-900">最新狀態：{reviewStatusLabel(event.status)}</span></div>
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-slate-500">活動日期</dt><dd>{event.start_date || "待確認"}{event.end_date && event.end_date !== event.start_date ? ` 至 ${event.end_date}` : ""}</dd></div>
      <div><dt className="text-xs text-slate-500">地點</dt><dd>{[event.venue_name, event.district, event.address].filter(Boolean).join(" · ") || "待確認"}</dd></div>
      <div><dt className="text-xs text-slate-500">價格</dt><dd>{event.price_type === "free" ? "免費" : [event.price_min, event.price_max].filter(v => v !== null).join("–") || "請到活動資料核對"}</dd></div>
    </dl>
    <p className="mt-3 text-xs text-sky-900">活動發佈前仍須核實時間、價格、圖片及來源。</p>
    <Link href={`/admin/events?search=${encodeURIComponent(event.title_tc || event.id)}`} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-sky-800 px-4 py-2 text-xs font-bold text-white">查看及審批完整活動 →</Link>
  </section>;
}

export default function AdminNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("unread");
  const [dateOrder, setDateOrder] = useState("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [merchantProfiles, setMerchantProfiles] = useState<Record<string, MerchantProfile>>({});
  const [eventProfiles, setEventProfiles] = useState<Record<string, EventProfile>>({});
  const [profileWarning, setProfileWarning] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");


  const displayedRows = useMemo(() => rows
    .filter(row => {
      const kindMatches = kindFilter === "all" || (kindFilter === "merchant"
        ? row.kind.startsWith("merchant_")
        : kindFilter === "event" ? row.kind.startsWith("event_")
        : !row.kind.startsWith("merchant_") && !row.kind.startsWith("event_"));
      const readMatches = readFilter === "all" || (readFilter === "unread" ? !row.read_at : !!row.read_at);
      const haystack = [row.title, row.message, row.email_to, row.id, row.status_snapshot, row.email_error].join(" ").toLowerCase();
      return kindMatches && readMatches && haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => dateOrder === "newest"
      ? Date.parse(b.created_at) - Date.parse(a.created_at)
      : Date.parse(a.created_at) - Date.parse(b.created_at)), [rows, query, kindFilter, readFilter, dateOrder]);

  const unreadCount = useMemo(
    () => rows.filter((row) => !row.read_at).length,
    [rows],
  );

  async function loadNotifications() {
    if (!supabase) {
      setMessage("系統暫時未能連接 Supabase。");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("platform_notifications")
      .select(
        "id,kind,recipient_scope,merchant_id,event_id,title,message,status_snapshot,email_to,email_sent,email_error,created_at,read_at",
      )
      .eq("recipient_scope", "admin")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage(error.message || "未能讀取通知。");
      setRows([]);
      setMerchantProfiles({});
      setEventProfiles({});
    } else {
      const notifications = (data || []) as NotificationRow[];
      setRows(notifications);
      setMessage("");
      setProfileWarning("");
      const merchantIds = [...new Set(notifications.map(row => row.merchant_id).filter((id): id is string => Boolean(id)))];
      const eventIds = [...new Set(notifications.map(row => row.event_id).filter((id): id is string => Boolean(id)))];
      const [merchantResult, eventResult] = await Promise.all([
        merchantIds.length
          ? supabase.from("merchants")
              .select("id,business_name,contact_name,contact_email,contact_phone,website_url,description,status,rejection_reason,terms_accepted_at,privacy_accepted_at,terms_version,created_at,updated_at")
              .in("id", merchantIds)
          : Promise.resolve({ data: [] as MerchantProfile[], error: null }),
        eventIds.length
          ? supabase.from("events")
              .select("id,title_tc,status,venue_name,address,district,start_date,end_date,price_type,price_min,price_max")
              .in("id", eventIds)
          : Promise.resolve({ data: [] as EventProfile[], error: null }),
      ]);
      if (merchantResult.error || eventResult.error) {
        setProfileWarning("部分詳細資料暫未能讀取，請到管理清單核對後再審批。");
      }
      setMerchantProfiles(Object.fromEntries(((merchantResult.data || []) as MerchantProfile[]).map(item => [item.id, item])));
      setEventProfiles(Object.fromEntries(((eventResult.data || []) as EventProfile[]).map(item => [item.id, item])));
    }

    setLoading(false);
  }

  async function markRead(id: string) {
    if (!supabase) return;

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from("platform_notifications")
      .update({ read_at: readAt })
      .eq("id", id);

    if (error) {
      setMessage(error.message || "未能更新通知。");
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, read_at: readAt } : row,
      ),
    );
  }

  async function reviewMerchant(merchantId: string, decision: "approved" | "rejected") {
    if (!supabase || reviewingId) return;
    const snapshot = merchantProfiles[merchantId];
    if (!snapshot || snapshot.status !== "pending") {
      setReviewMessage("商戶不是待審批狀態，請重新整理最新資料。");
      return;
    }
    if (decision === "approved" && (!snapshot.terms_accepted_at || !snapshot.privacy_accepted_at)) {
      setReviewMessage("缺少商戶條款或私隱接受紀錄，不能批准。");
      return;
    }
    const reason = rejectionReason.trim();
    if (decision === "rejected" && !reason) {
      setReviewMessage("請先輸入拒絕原因，方便商戶修改資料。");
      return;
    }
    if (!window.confirm(decision === "approved"
      ? `確認批准「${snapshot.business_name}」成為 HK Family Fun 商戶？`
      : `確認退回「${snapshot.business_name}」的商戶申請？`)) return;

    setReviewingId(merchantId);
    setReviewMessage("");
    try {
      const { data: fresh, error: lookupError } = await supabase.from("merchants")
        .select("id,business_name,contact_name,contact_email,contact_phone,website_url,description,status,rejection_reason,terms_accepted_at,privacy_accepted_at,terms_version,created_at,updated_at")
        .eq("id", merchantId).maybeSingle();
      if (lookupError || !fresh) throw new Error("最新商戶資料無法取得，審批已停止。");
      const latest = fresh as MerchantProfile;
      if (latest.status !== "pending" || latest.updated_at !== snapshot.updated_at) {
        setMerchantProfiles(previous => ({ ...previous, [merchantId]: latest }));
        throw new Error("商戶資料已變更，請核對最新內容後重新按審批。");
      }
      if (decision === "approved" && (!latest.terms_accepted_at || !latest.privacy_accepted_at)) {
        throw new Error("最新商戶資料缺少條款接受紀錄，不能批准。");
      }
      const { data: changed, error: updateError } = await supabase.from("merchants")
        .update({
          status: decision,
          rejection_reason: decision === "rejected" ? reason : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchantId)
        .eq("status", "pending")
        .eq("updated_at", latest.updated_at)
        .select("id,business_name,contact_name,contact_email,contact_phone,website_url,description,status,rejection_reason,terms_accepted_at,privacy_accepted_at,terms_version,created_at,updated_at")
        .maybeSingle();
      if (updateError) throw new Error("審批未儲存：" + updateError.message);
      if (!changed) throw new Error("商戶狀態已由其他管理員修改，請重新整理。");
      const updated = changed as MerchantProfile;
      setMerchantProfiles(previous => ({ ...previous, [merchantId]: updated }));
      setRejectingId(null);
      setRejectionReason("");
      setReviewMessage(`「${updated.business_name}」已${decision === "approved" ? "批准" : "退回"}。商戶狀態已儲存。`);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        try {
          const result = await fetch("/api/merchant-notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ action: "merchant_status_changed", merchant_id: merchantId, status: decision }),
          });
          const status = await result.json();
          if (!result.ok || !status.queued || !status.sent) {
            setReviewMessage(`「${updated.business_name}」狀態已儲存；商戶電郵通知尚未確認送達，請檢查通知記錄。`);
          }
        } catch {
          setReviewMessage(`「${updated.business_name}」狀態已儲存，但電郵通知暫時失敗，請稍後檢查。`);
        }
      } else {
        setReviewMessage(`「${updated.business_name}」狀態已儲存；登入狀態需更新後才能發送商戶通知。`);
      }
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "操作未完成，請重試。");
    } finally {
      setReviewingId(null);
    }
  }

  async function markAllRead() {
    if (!supabase || unreadCount === 0) return;

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from("platform_notifications")
      .update({ read_at: readAt })
      .eq("recipient_scope", "admin")
      .is("read_at", null);

    if (error) {
      setMessage(error.message || "未能更新通知。");
      return;
    }

    setRows((current) =>
      current.map((row) => ({ ...row, read_at: row.read_at || readAt })),
    );
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-purple-700">
                HK Family Fun Admin
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                通知中心
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                商戶註冊、建立活動、修改資料及提交審批會顯示在此。完整操作記錄可到「變更歷史」查看；即使電郵暫時未送出，站內通知仍會保留。
              </p>
            </div>

            <div className="flex gap-2">
              <Link href="/admin/change-history" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">變更歷史</Link>
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                重新整理
              </button>
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={unreadCount === 0}
                className="rounded-full bg-purple-700 px-4 py-2 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                全部標記已讀
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
              未讀 {unreadCount}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              最近 {rows.length} 項
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-8">
        {message ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {message}
          </div>
        ) : null}

        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-700">搜尋通知
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="標題、內容、Email、編號…" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-700">類別
            <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
              <option value="all">全部</option><option value="merchant">商戶</option><option value="event">活動</option><option value="other">其他</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700">狀態
            <select value={readFilter} onChange={e => setReadFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
              <option value="unread">未讀</option><option value="all">全部</option><option value="read">已讀</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700">日期排序
            <select value={dateOrder} onChange={e => setDateOrder(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
              <option value="newest">最近 → 最遠</option><option value="oldest">最遠 → 最近</option>
            </select>
          </label>
        </div>
        <p className="mb-4 text-xs text-slate-500">顯示 {displayedRows.length} 項。按通知建立日期排序（非活動或審批截止日期）；每次最多讀取最近 100 項。</p>
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
            正在讀取通知…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-black text-slate-900">暫時沒有通知</p>
            <p className="mt-2 text-sm text-slate-500">
              新商戶或新活動提交後會顯示在這裡。
            </p>
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-slate-600">沒有符合搜尋條件的通知</div>
        ) : (
          <div className="space-y-2">
            {displayedRows.map((row) => (
              <article
                key={row.id}
                className={[
                  "rounded-xl border bg-white p-3 shadow-sm",
                  row.read_at
                    ? "border-slate-200"
                    : "border-purple-200 ring-2 ring-purple-100",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={["rounded-full px-2.5 py-1 text-[11px] font-black",row.kind.startsWith("merchant_") ? "bg-violet-100 text-violet-800" : row.kind.startsWith("event_") ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"].join(" ")}>
                        {kindLabel(row.kind)}
                      </span>
                      {!row.read_at ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700">
                          未讀
                        </span>
                      ) : null}
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-black",
                          row.email_sent
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {row.email_sent ? "Email 已送出" : "站內通知"}
                      </span>
                    </div>

                    <button type="button" onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} aria-expanded={expandedId === row.id} className="mt-2 text-left text-sm font-black text-slate-950 hover:text-purple-700">
                      {row.title} <span className="text-xs font-normal text-slate-500">{expandedId === row.id ? "▲ 收起" : "▼ 詳情"}</span>
                    </button>
                    {expandedId === row.id && row.message ? (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {row.message}
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      <span>{formatTime(row.created_at)}</span>
                      {row.status_snapshot ? (
                        <span>狀態：{row.status_snapshot}</span>
                      ) : null}
                      {row.email_error ? (
                        <span className="text-amber-700">
                          Email：{row.email_error}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {["event_submitted", "event_status_changed", "event_created", "event_updated"].includes(row.kind) ? (
                      <Link
                        href={row.event_id ? `/admin/events/${row.event_id}` : "/admin/events"}
                        className="rounded-full bg-slate-950 px-4 py-2 text-center text-xs font-black text-white hover:bg-slate-800"
                      >
                        查看活動
                      </Link>
                    ) : null}

                    {["merchant_registered", "merchant_status_changed", "merchant_updated"].includes(row.kind) ? (
                      <Link
                        href="/admin/merchants"
                        className="rounded-full bg-slate-950 px-4 py-2 text-center text-xs font-black text-white hover:bg-slate-800"
                      >
                        查看商戶
                      </Link>
                    ) : null}

                    {!row.read_at ? (
                      <button
                        type="button"
                        onClick={() => void markRead(row.id)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        標記已讀
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
