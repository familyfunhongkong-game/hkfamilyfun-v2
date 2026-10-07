"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
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

  const canSubmit = useMemo(
    () => Boolean(form.campaign_name.trim()) && !busy,
    [form.campaign_name, busy],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorText("");

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
        error?: string;
        reason?: string;
      };

      if (!response.ok || !result.submitted) {
        throw new Error(result.error || result.reason || "提交失敗。");
      }

      setRequestId(result.request_id || id);
      setMessage(
        "已收到廣告查詢。HK Family Fun 會先確認版位、檔期及收費；付款確認後才會安排上架。",
      );
      setForm(initialState);
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
  );
}
