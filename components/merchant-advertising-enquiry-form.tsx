"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type FormState = {
  promotion_type: string;
  campaign_name: string;
  official_url: string;
  preferred_start: string;
  duration: string;
  budget_range: string;
  notes: string;
};

type AdvertisingOrder = {
  id: string;
  request_id: string;
  promotion_type: string;
  campaign_name: string;
  preferred_start?: string | null;
  status: string;
  payment_status: string;
  quoted_amount?: number | string | null;
  currency?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
};

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    enquiry: "已查詢",
    quoted: "已報價",
    payment_pending: "待付款確認",
    paid: "已確認付款",
    scheduled: "已排期",
    live: "投放中",
    completed: "已完成",
    cancelled: "已取消",
    rejected: "未能安排",
  };
  return labels[status] || status;
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    not_requested: "未要求付款",
    pending: "待付款",
    paid: "已付款",
    refunded: "已退款",
    failed: "付款未完成",
  };
  return labels[status] || status;
}

function promotionTypeLabel(value: string) {
  if (value === "home_banner") return "首頁 Banner / Hero";
  if (value === "events_featured") return "活動搜尋頁 Featured";
  if (value === "sponsored_content") return "Sponsored Content";
  return "其他合作";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

const initialState: FormState = {
  promotion_type: "events_featured",
  campaign_name: "",
  official_url: "",
  preferred_start: "",
  duration: "1_week",
  budget_range: "",
  notes: "",
};

export default function MerchantAdvertisingEnquiryForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [requestId, setRequestId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [notificationWarning, setNotificationWarning] = useState("");
  const [history, setHistory] = useState<AdvertisingOrder[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const canSubmit = useMemo(
    () => Boolean(form.campaign_name.trim()) && !busy,
    [form.campaign_name, busy],
  );

  const loadHistory = useCallback(async () => {
    if (!supabase) {
      setHistoryLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("merchant_advertising_orders")
      .select(
        "id,request_id,promotion_type,campaign_name,preferred_start,status,payment_status,quoted_amount,currency,starts_at,ends_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(12);

    if (!error && data) {
      setHistory(data as AdvertisingOrder[]);
    }

    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorText("");
    setNotificationWarning("");

    if (!supabase) {
      setErrorText("系統暫時未能連接商戶帳戶服務。");
      return;
    }

    if (!form.campaign_name.trim()) {
      setErrorText("請輸入 Campaign / 活動名稱。");
      return;
    }

    setBusy(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (sessionError || !token) {
      setBusy(false);
      setErrorText("請先登入已批准的商戶帳戶再提交廣告查詢。");
      return;
    }

    const id = crypto.randomUUID();

    try {
      const response = await fetch("/api/merchant-advertising-enquiry", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: id,
          ...form,
        }),
      });

      const result = (await response.json()) as {
        submitted?: boolean;
        request_id?: string;
        order_id?: string;
        notification_warning?: string | null;
        error?: string;
        reason?: string;
      };

      if (!response.ok || !result.submitted) {
        throw new Error(result.error || result.reason || "提交失敗。");
      }

      setRequestId(result.request_id || id);
      setOrderId(result.order_id || "");
      setNotificationWarning(result.notification_warning || "");
      setMessage(
        "已收到廣告查詢並安全儲存。HK Family Fun 會先確認版位、檔期及收費；付款確認後才會安排上架。",
      );
      setForm(initialState);
      await loadHistory();
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "暫時未能提交廣告查詢，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-700">
            Advertising Enquiry
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            直接提交廣告查詢
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            不需要離開 Merchant Portal 寫 email。提交後 HK Family Fun 會收到商戶及 campaign 資料，再確認檔期、價錢及付款安排。
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
          查詢 ≠ 已預留版位
        </span>
      </div>

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">
          {message}
          {requestId ? (
            <span className="mt-1 block text-xs font-semibold text-emerald-700">
              Request ID：{requestId}
            </span>
          ) : null}
          {orderId ? (
            <span className="mt-1 block text-xs font-semibold text-emerald-700">
              Order ID：{orderId}
            </span>
          ) : null}
          {notificationWarning ? (
            <span className="mt-2 block rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              {notificationWarning}
            </span>
          ) : null}
        </div>
      ) : null}

      {errorText ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900">
          {errorText}
          {errorText.includes("登入") ? (
            <Link
              href="/merchant/login"
              className="ml-2 underline underline-offset-2"
            >
              商戶登入
            </Link>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-black text-slate-600">
            廣告類型 *
            <select
              value={form.promotion_type}
              onChange={(event) =>
                setForm({ ...form, promotion_type: event.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="events_featured">活動搜尋頁 Featured</option>
              <option value="home_banner">首頁 Banner / Hero</option>
              <option value="sponsored_content">News / Feature Sponsored</option>
              <option value="other">其他合作</option>
            </select>
          </label>

          <label className="text-xs font-black text-slate-600">
            Campaign / 活動名稱 *
            <input
              required
              maxLength={120}
              value={form.campaign_name}
              onChange={(event) =>
                setForm({ ...form, campaign_name: event.target.value })
              }
              placeholder="例如：親子萬聖節嘉年華"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
            />
          </label>
        </div>

        <label className="text-xs font-black text-slate-600">
          官方 / 活動連結
          <input
            type="url"
            value={form.official_url}
            onChange={(event) =>
              setForm({ ...form, official_url: event.target.value })
            }
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-black text-slate-600">
            希望開始日期
            <input
              type="date"
              value={form.preferred_start}
              onChange={(event) =>
                setForm({ ...form, preferred_start: event.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
            />
          </label>

          <label className="text-xs font-black text-slate-600">
            預計投放期
            <select
              value={form.duration}
              onChange={(event) =>
                setForm({ ...form, duration: event.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="1_week">1 星期</option>
              <option value="2_weeks">2 星期</option>
              <option value="1_month">1 個月</option>
              <option value="discuss">想先傾</option>
            </select>
          </label>

          <label className="text-xs font-black text-slate-600">
            預算範圍（可選）
            <select
              value={form.budget_range}
              onChange={(event) =>
                setForm({ ...form, budget_range: event.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="">未決定</option>
              <option value="under_1000">HK$1,000 以下</option>
              <option value="1000_3000">HK$1,000–3,000</option>
              <option value="3000_5000">HK$3,000–5,000</option>
              <option value="5000_plus">HK$5,000+</option>
            </select>
          </label>
        </div>

        <label className="text-xs font-black text-slate-600">
          其他要求 / 備註
          <textarea
            maxLength={2000}
            value={form.notes}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
            placeholder="例如：想集中推廣九龍區家庭、希望周末前上架..."
            className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
          />
        </label>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-950">
          一般活動 Listing 仍然免費。只有你主動選擇額外 Banner / Featured / Sponsored 曝光先收費；提交查詢不代表已付款、已預留版位或保證上架。
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "提交中…" : "提交付費廣告查詢"}
        </button>
      </form>
      </section>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              My Advertising Requests
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">廣告查詢紀錄</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              只會顯示你自己商戶帳戶提交嘅查詢。付款狀態由 HK Family Fun Admin 確認，商戶不能自行更改。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
          >
            重新整理
          </button>
        </div>

        {historyLoading ? (
          <p className="mt-5 text-sm font-bold text-slate-400">讀取查詢紀錄…</p>
        ) : history.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-bold text-slate-500">
            暫時未有廣告查詢紀錄。
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {history.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-purple-700">
                      {promotionTypeLabel(order.promotion_type)}
                    </p>
                    <h3 className="mt-1 font-black text-slate-950">{order.campaign_name}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Request {order.request_id} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
                      {orderStatusLabel(order.status)}
                    </span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                      {paymentStatusLabel(order.payment_status)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-3">
                  <p>希望開始：{order.preferred_start || "未指定"}</p>
                  <p>正式排期：{formatDateTime(order.starts_at)}</p>
                  <p>
                    報價：
                    {order.quoted_amount !== null && order.quoted_amount !== undefined
                      ? `${order.currency || "HKD"} ${order.quoted_amount}`
                      : "待確認"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
