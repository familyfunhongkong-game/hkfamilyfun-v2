"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  kind: string;
  merchant_id: string | null;
  event_id: string | null;
  title: string;
  message: string | null;
  status_snapshot: string | null;
  email_sent: boolean;
  created_at: string;
};

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
  if (kind === "event_status_changed") return "活動狀態";
  if (kind === "merchant_status_changed") return "商戶帳戶";
  return "平台通知";
}

export default function MerchantNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadNotifications() {
    const client = supabase;

    if (!client) {
      setMessage("系統暫時未能連接帳戶服務。");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      setMessage("請先登入商戶帳戶。");
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("platform_notifications")
      .select(
        "id,kind,merchant_id,event_id,title,message,status_snapshot,email_sent,created_at",
      )
      .eq("recipient_scope", "merchant")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage(error.message || "未能讀取通知。");
      setRows([]);
    } else {
      setRows((data || []) as NotificationRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-purple-700">
                HK Family Fun Merchant Portal
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                商戶通知
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                平台批准、退回修改、發布或商戶帳戶狀態更新會保留在這裡。即使 email 暫時未能送達，你仍可以在 Portal 查看最新狀態。
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/merchant/dashboard"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                返回 Dashboard
              </Link>
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="rounded-full bg-purple-700 px-4 py-2 text-sm font-black text-white hover:bg-purple-800"
              >
                重新整理
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        {message ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
            正在讀取通知…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-black text-slate-900">暫時沒有平台通知</p>
            <p className="mt-2 text-sm text-slate-500">
              活動或商戶狀態有更新時會顯示在這裡。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <article
                key={row.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-black text-purple-800">
                        {kindLabel(row.kind)}
                      </span>
                      {row.status_snapshot ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                          {row.status_snapshot}
                        </span>
                      ) : null}
                      {row.email_sent ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                          Email 已送出
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-lg font-black text-slate-950">
                      {row.title}
                    </h2>
                    {row.message ? (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {row.message}
                      </p>
                    ) : null}
                    <p className="mt-4 text-xs font-bold text-slate-400">
                      {formatTime(row.created_at)}
                    </p>
                  </div>

                  {row.event_id ? (
                    <Link
                      href={`/merchant/events/${row.event_id}/preview`}
                      className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      查看活動
                    </Link>
                  ) : (
                    <Link
                      href="/merchant/profile"
                      className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      商戶資料
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
