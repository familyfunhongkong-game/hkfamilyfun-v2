"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AdvertisingOrder = {
  id: string;
  request_id: string;
  merchant_id: string;
  promo_banner_id?: string | null;
  promotion_type: string;
  campaign_name: string;
  official_url?: string | null;
  preferred_start?: string | null;
  duration_key?: string | null;
  budget_range?: string | null;
  notes?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  status: string;
  quoted_amount?: number | string | null;
  currency: string;
  payment_status: string;
  paid_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
};

type Merchant = {
  id: string;
  business_name: string;
  contact_email?: string | null;
};

type Banner = {
  id: string;
  internal_name?: string | null;
  headline_tc?: string | null;
  status: string;
  is_paid: boolean;
  sponsor_name?: string | null;
};

type Editor = {
  status: string;
  payment_status: string;
  quoted_amount: string;
  starts_at: string;
  ends_at: string;
  promo_banner_id: string;
  admin_notes: string;
};

const stages = [
  "enquiry",
  "quoted",
  "payment_pending",
  "paid",
  "scheduled",
  "live",
  "completed",
] as const;

const statusLabels: Record<string, string> = {
  enquiry: "Enquiry",
  quoted: "Quoted",
  payment_pending: "Payment Pending",
  paid: "Paid",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const paymentLabels: Record<string, string> = {
  not_requested: "Not requested",
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
};

function promotionLabel(value: string) {
  if (value === "home_banner") return "首頁 Banner / Hero";
  if (value === "events_featured") return "活動搜尋頁 Featured";
  if (value === "sponsored_content") return "Sponsored Content";
  return "其他合作";
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function displayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function editorFromOrder(order: AdvertisingOrder): Editor {
  return {
    status: order.status,
    payment_status: order.payment_status,
    quoted_amount:
      order.quoted_amount === null || order.quoted_amount === undefined
        ? ""
        : String(order.quoted_amount),
    starts_at: toLocalInput(order.starts_at),
    ends_at: toLocalInput(order.ends_at),
    promo_banner_id: order.promo_banner_id || "",
    admin_notes: order.admin_notes || "",
  };
}

export default function AdminAdvertisingPage() {
  const [orders, setOrders] = useState<AdvertisingOrder[]>([]);
  const [merchants, setMerchants] = useState<Record<string, Merchant>>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const load = useCallback(async () => {
    if (!supabase) {
      setErrorText("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorText("");

    const [ordersResult, merchantsResult, bannersResult] = await Promise.all([
      supabase
        .from("merchant_advertising_orders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("merchants")
        .select("id,business_name,contact_email"),
      supabase
        .from("promo_banners")
        .select("id,internal_name,headline_tc,status,is_paid,sponsor_name")
        .order("updated_at", { ascending: false }),
    ]);

    if (ordersResult.error) {
      setErrorText(ordersResult.error.message || "讀取廣告查詢失敗。");
      setLoading(false);
      return;
    }

    const nextOrders = (ordersResult.data || []) as AdvertisingOrder[];
    setOrders(nextOrders);

    const merchantMap: Record<string, Merchant> = {};
    for (const merchant of (merchantsResult.data || []) as Merchant[]) {
      merchantMap[merchant.id] = merchant;
    }
    setMerchants(merchantMap);
    setBanners((bannersResult.data || []) as Banner[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => orders.find((item) => item.id === selectedId) || null,
    [orders, selectedId],
  );

  const shown = useMemo(
    () => (filter === "all" ? orders : orders.filter((item) => item.status === filter)),
    [orders, filter],
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders.length };
    for (const order of orders) {
      result[order.status] = (result[order.status] || 0) + 1;
    }
    return result;
  }, [orders]);

  function selectOrder(order: AdvertisingOrder) {
    setSelectedId(order.id);
    setEditor(editorFromOrder(order));
    setMessage("");
    setErrorText("");
  }

  async function saveEditor() {
    if (!supabase || !selected || !editor) return;

    setMessage("");
    setErrorText("");

    const amount = editor.quoted_amount.trim()
      ? Number(editor.quoted_amount)
      : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setErrorText("報價金額必須係 0 或以上數字。");
      return;
    }

    const paidStages = new Set(["paid", "scheduled", "live", "completed"]);
    if (paidStages.has(editor.status) && editor.payment_status !== "paid") {
      setErrorText("Paid / Scheduled / Live / Completed 必須先確認 Payment Status = Paid。");
      return;
    }

    if (editor.status === "live" && !editor.promo_banner_id) {
      setErrorText("標記 Live 前必須先連結一個 Promotion Banner。");
      return;
    }

    const startsAt = toIso(editor.starts_at);
    const endsAt = toIso(editor.ends_at);
    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      setErrorText("落架時間不可早過上架時間。");
      return;
    }

    if (editor.status === "scheduled" && !startsAt) {
      setErrorText("Scheduled 必須設定 Start 時間。");
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      status: editor.status,
      payment_status: editor.payment_status,
      quoted_amount: amount,
      promo_banner_id: editor.promo_banner_id || null,
      starts_at: startsAt,
      ends_at: endsAt,
      admin_notes: editor.admin_notes.trim() || null,
      paid_at:
        editor.payment_status === "paid"
          ? selected.paid_at || new Date().toISOString()
          : null,
    };

    const { data, error } = await supabase
      .from("merchant_advertising_orders")
      .update(payload)
      .eq("id", selected.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      setErrorText(error?.message || "更新廣告訂單失敗。");
      setSaving(false);
      return;
    }

    const savedOrder = data as AdvertisingOrder;

    let bannerSyncError = "";
    if (editor.promo_banner_id) {
      const bannerPayload: Record<string, unknown> = {};

      if (editor.payment_status === "paid") {
        bannerPayload.is_paid = true;
      }
      if (editor.payment_status === "refunded") {
        bannerPayload.is_paid = false;
        bannerPayload.status = "paused";
      }

      if (startsAt !== null) bannerPayload.starts_at = startsAt;
      if (endsAt !== null) bannerPayload.ends_at = endsAt;

      if (editor.status === "live") {
        bannerPayload.is_paid = true;
        bannerPayload.status = "active";
      }
      if (editor.status === "completed") {
        bannerPayload.status = "archived";
      }

      if (Object.keys(bannerPayload).length > 0) {
        const bannerResult = await supabase
          .from("promo_banners")
          .update(bannerPayload)
          .eq("id", editor.promo_banner_id);

        if (bannerResult.error) {
          bannerSyncError = bannerResult.error.message;
        }
      }
    }

    setOrders((current) =>
      current.map((item) => (item.id === selected.id ? savedOrder : item)),
    );
    setEditor(editorFromOrder(savedOrder));

    if (bannerSyncError) {
      setErrorText(
        "Advertising order 已儲存，但 linked Banner 未能同步：" + bannerSyncError +
          "。Banner 仍受 Promotion Manager 安全鎖保護，不會因為呢個錯誤而誤上架。",
      );
      setMessage("");
    } else {
      setMessage(
        editor.promo_banner_id
          ? "Advertising order 已更新；linked Banner 商業狀態／排期已同步。"
          : "Advertising order 已更新。",
      );
    }
    setSaving(false);
  }

  function moveTo(order: AdvertisingOrder, nextStatus: string) {
    setSelectedId(order.id);
    setErrorText("");

    const next = editorFromOrder(order);
    next.status = nextStatus;

    if (nextStatus === "payment_pending") {
      next.payment_status = "pending";
    }
    if (["paid", "scheduled", "live", "completed"].includes(nextStatus)) {
      next.payment_status = "paid";
    }

    setEditor(next);

    // The actual write stays behind the editor save so Admin must review quote,
    // payment and scheduling fields before mutating commercial status.
    setMessage(`已準備轉到 ${statusLabels[nextStatus] || nextStatus}；請檢查右側資料後按「儲存變更」。`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link href="/admin" className="text-sm font-black text-purple-700">
                ← 返回 Admin
              </Link>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                Paid Advertising CRM
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">
                廣告查詢・報價・付款・排期
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                免費 Event Listing 同付費曝光完全分開。呢度只管理商戶主動提交嘅 Banner / Featured / Sponsored 查詢。
                Payment 必須由 Admin 確認，商戶無權自行標記 Paid。
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/promotions"
                className="rounded-full border border-purple-200 bg-white px-5 py-3 text-sm font-black text-purple-700"
              >
                Promotion Banners
              </Link>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
              >
                重新整理
              </button>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              {message}
            </div>
          ) : null}
          {errorText ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
              {errorText}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {[
            ["all", "全部"],
            ...stages.map((stage) => [stage, statusLabels[stage]]),
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={
                filter === key
                  ? "rounded-2xl bg-slate-950 p-4 text-left text-white"
                  : "rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-700"
              }
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.08em] opacity-60">
                {label}
              </span>
              <span className="mt-1 block text-2xl font-black">{counts[key] || 0}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">
                讀取 Advertising CRM…
              </div>
            ) : shown.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
                暫時沒有符合條件的廣告查詢。
              </div>
            ) : (
              shown.map((order) => {
                const merchant = merchants[order.merchant_id];
                return (
                  <article
                    key={order.id}
                    className={
                      selectedId === order.id
                        ? "rounded-[2rem] border-2 border-purple-500 bg-white p-5 shadow-sm"
                        : "rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-purple-700">
                          {promotionLabel(order.promotion_type)}
                        </p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">
                          {order.campaign_name}
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {merchant?.business_name || "Merchant"} · {displayDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
                          {statusLabels[order.status] || order.status}
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                          {paymentLabels[order.payment_status] || order.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p>希望開始：{order.preferred_start || "未指定"}</p>
                      <p>
                        報價：
                        {order.quoted_amount !== null && order.quoted_amount !== undefined
                          ? `${order.currency} ${order.quoted_amount}`
                          : "未報價"}
                      </p>
                      <p>上架：{displayDate(order.starts_at)}</p>
                      <p>落架：{displayDate(order.ends_at)}</p>
                    </div>

                    {order.notes ? (
                      <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                        {order.notes}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectOrder(order)}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
                      >
                        管理
                      </button>
                      {stages
                        .filter((stage) => stage !== order.status)
                        .slice(0, 4)
                        .map((stage) => (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => moveTo(order, stage)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-600"
                          >
                            → {statusLabels[stage]}
                          </button>
                        ))}
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <aside className="xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              {!selected || !editor ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-black text-slate-700">選擇一個廣告查詢</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    管理報價、付款確認、Banner 關聯及實際排期。
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-700">
                    Order Editor
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {selected.campaign_name}
                  </h2>
                  <p className="mt-1 break-all text-[11px] font-semibold text-slate-400">
                    {selected.request_id}
                  </p>

                  <div className="mt-5 space-y-4">
                    <label className="block text-xs font-black text-slate-600">
                      Pipeline Status
                      <select
                        value={editor.status}
                        onChange={(event) =>
                          setEditor({ ...editor, status: event.target.value })
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                      >
                        {[...stages, "cancelled", "rejected"].map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status] || status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-black text-slate-600">
                      Payment Status
                      <select
                        value={editor.payment_status}
                        onChange={(event) =>
                          setEditor({ ...editor, payment_status: event.target.value })
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                      >
                        {Object.entries(paymentLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-xs font-black text-slate-600">
                      Quote Amount (HKD)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editor.quoted_amount}
                        onChange={(event) =>
                          setEditor({ ...editor, quoted_amount: event.target.value })
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                      />
                    </label>

                    <label className="block text-xs font-black text-slate-600">
                      Linked Promotion Banner
                      <select
                        value={editor.promo_banner_id}
                        onChange={(event) =>
                          setEditor({ ...editor, promo_banner_id: event.target.value })
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                      >
                        <option value="">未連結 Banner</option>
                        {banners.map((banner) => (
                          <option key={banner.id} value={banner.id}>
                            {banner.internal_name || banner.headline_tc || banner.id}
                            {banner.is_paid ? " · Sponsored" : " · Unpaid"}
                            {banner.status ? ` · ${banner.status}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-black text-slate-600">
                        Start
                        <input
                          type="datetime-local"
                          value={editor.starts_at}
                          onChange={(event) =>
                            setEditor({ ...editor, starts_at: event.target.value })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                        />
                      </label>
                      <label className="text-xs font-black text-slate-600">
                        End
                        <input
                          type="datetime-local"
                          value={editor.ends_at}
                          onChange={(event) =>
                            setEditor({ ...editor, ends_at: event.target.value })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                        />
                      </label>
                    </div>

                    <label className="block text-xs font-black text-slate-600">
                      Admin Notes
                      <textarea
                        value={editor.admin_notes}
                        onChange={(event) =>
                          setEditor({ ...editor, admin_notes: event.target.value })
                        }
                        className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                        placeholder="記錄報價、付款確認方式、檔期或商戶溝通。"
                      />
                    </label>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                      Live 前必須：Payment = Paid + 連結 Banner。呢個頁面只記錄 HK Family Fun 已確認嘅商業狀態；商戶無權自行改付款狀態。
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveEditor()}
                      className="w-full rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      {saving ? "儲存中…" : "儲存變更"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
