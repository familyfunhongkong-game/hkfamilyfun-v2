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
  if (kind === "merchant_registered") return "新商戶";
  if (kind === "event_submitted") return "活動待審";
  if (kind === "event_status_changed") return "活動狀態";
  if (kind === "merchant_status_changed") return "商戶狀態";
  return kind;
}

export default function AdminNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
    } else {
      setRows((data || []) as NotificationRow[]);
      setMessage("");
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
                所有新商戶及活動審批通知會先寫入站內 queue。即使 email provider 暫時未設定或失效，Admin 仍然可以在這裡看到待處理事項。
              </p>
            </div>

            <div className="flex gap-2">
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
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <article
                key={row.id}
                className={[
                  "rounded-3xl border bg-white p-5 shadow-sm",
                  row.read_at
                    ? "border-slate-200"
                    : "border-purple-200 ring-2 ring-purple-100",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-black text-purple-800">
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

                    <h2 className="mt-3 text-lg font-black text-slate-950">
                      {row.title}
                    </h2>
                    {row.message ? (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {row.message}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-400">
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
                    {row.kind === "event_submitted" || row.kind === "event_status_changed" ? (
                      <Link
                        href={row.event_id ? `/admin/events/${row.event_id}` : "/admin/events"}
                        className="rounded-full bg-slate-950 px-4 py-2 text-center text-xs font-black text-white hover:bg-slate-800"
                      >
                        查看活動
                      </Link>
                    ) : null}

                    {row.kind === "merchant_registered" || row.kind === "merchant_status_changed" ? (
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
