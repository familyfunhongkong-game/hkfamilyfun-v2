"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Merchant = {
  id: string;
  business_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  description?: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Status = Merchant["status"];

const statusLabel: Record<Status, string> = {
  pending: "待審批",
  approved: "已批准",
  rejected: "已拒絕",
  suspended: "已暫停",
};

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");

  async function loadMerchants() {
    if (!supabase) {
      setErrorText("Supabase 尚未初始化。");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("merchants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message || "讀取商戶失敗。");
      setMerchants([]);
    } else {
      setMerchants((data || []) as Merchant[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadMerchants();
  }, []);

  async function updateMerchantStatus(
    merchant: Merchant,
    status: Status,
  ) {
    if (!supabase) return;

    let reason = merchant.rejection_reason || null;

    if (status === "rejected") {
      reason =
        window.prompt(
          "請輸入拒絕原因（商戶日後可按此修改資料）：",
          merchant.rejection_reason || "",
        )?.trim() || "未符合 HK Family Fun 商戶／活動平台要求。";
    }

    if (status === "approved" || status === "pending") {
      reason = null;
    }

    setBusyId(merchant.id);
    setMessage("");
    setErrorText("");

    const { data, error } = await supabase
      .from("merchants")
      .update({
        status,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchant.id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      setErrorText(
        error?.message ||
          "資料庫沒有更新任何商戶。請確認 Admin 權限後再試。",
      );
    } else {
      setMerchants((previous) =>
        previous.map((item) =>
          item.id === merchant.id ? (data as Merchant) : item,
        ),
      );
      setMessage(
        `${merchant.business_name} 已更新為「${statusLabel[status]}」。`,
      );
    }

    setBusyId("");
  }

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return merchants;

    return merchants.filter((merchant) =>
      [
        merchant.business_name,
        merchant.contact_name,
        merchant.contact_email,
        merchant.contact_phone,
        merchant.website_url,
        merchant.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(keyword),
    );
  }, [merchants, search]);

  const counts = useMemo(
    () => ({
      total: merchants.length,
      pending: merchants.filter((item) => item.status === "pending").length,
      approved: merchants.filter((item) => item.status === "approved").length,
      rejected: merchants.filter((item) => item.status === "rejected").length,
      suspended: merchants.filter((item) => item.status === "suspended").length,
    }),
    [merchants],
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-7">
          <Link
            href="/admin"
            className="text-sm font-black text-purple-700 hover:text-purple-900"
          >
            ← 返回 Admin
          </Link>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950">
                商戶審批中心
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                新商戶登記後先進入待審批。只有已批准商戶可以建立及提交活動。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadMerchants()}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-black text-slate-700"
            >
              重新整理
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["全部", counts.total],
              ["待審批", counts.pending],
              ["已批准", counts.approved],
              ["已拒絕", counts.rejected],
              ["已暫停", counts.suspended],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-xs font-black text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜尋商戶、聯絡人、Email、電話..."
          className="w-full max-w-2xl rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
        />

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {message}
          </div>
        ) : null}

        {errorText ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-600">
            正在讀取商戶...
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filtered.map((merchant) => (
              <article
                key={merchant.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-slate-950">
                        {merchant.business_name}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {statusLabel[merchant.status]}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>聯絡人：{merchant.contact_name || "未填"}</p>
                      <p>Email：{merchant.contact_email || "未填"}</p>
                      <p>電話：{merchant.contact_phone || "未填"}</p>
                      <p>網站：{merchant.website_url || "未填"}</p>
                    </div>
                    {merchant.description ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {merchant.description}
                      </p>
                    ) : null}
                    {merchant.rejection_reason ? (
                      <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        拒絕原因：{merchant.rejection_reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === merchant.id}
                      onClick={() => void updateMerchantStatus(merchant, "approved")}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      批准
                    </button>
                    <button
                      type="button"
                      disabled={busyId === merchant.id}
                      onClick={() => void updateMerchantStatus(merchant, "pending")}
                      className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 disabled:opacity-50"
                    >
                      待審批
                    </button>
                    <button
                      type="button"
                      disabled={busyId === merchant.id}
                      onClick={() => void updateMerchantStatus(merchant, "rejected")}
                      className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-black text-rose-800 disabled:opacity-50"
                    >
                      拒絕
                    </button>
                    <button
                      type="button"
                      disabled={busyId === merchant.id}
                      onClick={() => void updateMerchantStatus(merchant, "suspended")}
                      className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
                    >
                      暫停
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-600">
                沒有符合條件的商戶。
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
