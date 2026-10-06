"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Intake = {
  id: string;
  source_type: string;
  submission_type: string;
  status: string;
  payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
  linked_event_id: string | null;
  received_at: string;
};

function titleOf(row: Intake) {
  const n = row.normalized_payload || {};
  const p = row.payload || {};
  return String(
    n.title_tc ||
      p["活動標題 *"] ||
      p["活動名稱(繁體)"] ||
      p["活動標題"] ||
      p["公司/活動主辦方名稱 (中文)"] ||
      "未命名 Intake",
  );
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-HK", {
      timeZone: "Asia/Hong_Kong",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminIntakePage() {
  const [rows, setRows] = useState<Intake[]>([]);
  const [filter, setFilter] = useState("attention");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [batchWorking, setBatchWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function load() {
    if (!supabase) {
      setErrorText("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    setLoading(true);
    const response = await supabase
      .from("intake_submissions")
      .select(
        "id,source_type,submission_type,status,payload,normalized_payload,linked_event_id,received_at",
      )
      .order("received_at", { ascending: false })
      .limit(250);

    if (response.error) {
      setRows([]);
      setErrorText(response.error.message);
    } else {
      setRows((response.data || []) as Intake[]);
      setErrorText("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const shown = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "attention") {
      return rows.filter((row) =>
        ["new", "normalized", "needs_review"].includes(row.status),
      );
    }
    return rows.filter((row) => row.status === filter);
  }, [rows, filter]);

  async function normalizeAll() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setErrorText("請先登入 Admin。");
      return;
    }

    const queue = rows.filter((row) =>
      ["new", "needs_review"].includes(row.status),
    );
    if (!queue.length) {
      setMessage("目前冇需要 Normalize 嘅 Intake。");
      return;
    }

    setBatchWorking(true);
    setMessage("");
    setErrorText("");
    let ok = 0;
    let failed = 0;

    for (const row of queue) {
      try {
        const response = await fetch("/api/admin/intake/normalize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ id: row.id }),
        });
        if (response.ok) ok += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    setBatchWorking(false);
    setMessage("Normalize All 完成：" + ok + " 成功，" + failed + " 失敗。");
    await load();
  }

  async function run(path: string, id: string) {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setErrorText("請先登入 Admin。");
      return;
    }

    setWorkingId(id);
    setMessage("");
    setErrorText("");

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ id }),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || "處理失敗");

      setMessage(
        path.includes("normalize")
          ? body.generated_by_ai
            ? "AI Normalize 完成。請核對後再建立 Event Draft。"
            : "Normalize 完成。未設定 AI API 時會使用安全 rule-based mapping。"
          : "Event Draft 已建立；仍未公開，請到活動管理核對。",
      );
      await load();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "處理失敗。");
    }

    setWorkingId("");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <Link href="/admin/operations" className="text-sm font-black text-purple-700">
            ← 返回 Operations Hub
          </Link>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-purple-700">
            Data Inbox
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Drive / Forms / Sheets Intake
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            所有外部資料先入 Inbox。Normalize 會整理欄位及檢查可能重覆；建立 Event Draft
            後仍需 Admin 審批先公開。
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void normalizeAll()}
              disabled={batchWorking}
              className="rounded-full bg-purple-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              {batchWorking ? "批量整理中…" : "Normalize All"}
            </button>
            {["attention", "new", "normalized", "needs_review", "linked", "ignored", "all"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={
                    filter === item
                      ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
                      : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
                  }
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8">
        {message ? (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            {message}
          </div>
        ) : null}
        {errorText ? (
          <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {errorText}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">
            讀取 Intake…
          </div>
        ) : null}

        <div className="space-y-4">
          {!loading && shown.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
              暫時沒有呢個狀態嘅 Intake。
            </div>
          ) : null}

          {shown.map((row) => {
            const normalization = (row.normalized_payload?.normalization || {}) as {
              duplicate_candidates?: unknown[];
              validation_reasons?: unknown[];
              schema_drift_detected?: boolean;
            };
            const duplicateCount = Array.isArray(normalization.duplicate_candidates)
              ? normalization.duplicate_candidates.length
              : 0;
            const validationReasons = Array.isArray(normalization.validation_reasons)
              ? normalization.validation_reasons
                  .map((item) => String(item || "").trim())
                  .filter(Boolean)
              : [];
            const hasBlockingIssue =
              row.status === "needs_review" ||
              duplicateCount > 0 ||
              validationReasons.length > 0 ||
              normalization.schema_drift_detected === true;

            return (
              <article
                key={row.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
                        {row.source_type}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                        {row.status}
                      </span>
                      {duplicateCount > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">
                          可能重覆 {duplicateCount}
                        </span>
                      ) : null}
                      {normalization.schema_drift_detected ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-800">
                          欄位錯位
                        </span>
                      ) : null}
                      {validationReasons.length > 0 ? (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-800">
                          需人工檢查
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-xl font-black text-slate-950">
                      {titleOf(row)}
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      收到：{formatTime(row.received_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {row.status !== "linked" ? (
                      <button
                        type="button"
                        disabled={workingId === row.id}
                        onClick={() => void run("/api/admin/intake/normalize", row.id)}
                        className="rounded-full bg-purple-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                      >
                        {workingId === row.id ? "處理中…" : "Normalize + 查重"}
                      </button>
                    ) : null}

                    {row.status === "normalized" &&
                    !hasBlockingIssue &&
                    !row.linked_event_id ? (
                      <button
                        type="button"
                        disabled={workingId === row.id}
                        onClick={() => void run("/api/admin/intake/promote", row.id)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                      >
                        建立 Event Draft
                      </button>
                    ) : null}

                    {row.linked_event_id ? (
                      <Link
                        href={"/admin/events/" + row.linked_event_id}
                        className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-black text-emerald-700"
                      >
                        查看 Event Draft
                      </Link>
                    ) : null}
                  </div>
                </div>

                {hasBlockingIssue ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-900">
                      暫停建立 Event Draft
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                      請先修正重覆、欄位錯位、過期或其他資料驗證問題，再重新 Normalize。
                    </p>
                    {validationReasons.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-amber-900">
                        {validationReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <summary className="cursor-pointer text-sm font-black text-slate-700">
                      Raw Source Data
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  </details>

                  <details
                    open={row.status !== "new"}
                    className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4"
                  >
                    <summary className="cursor-pointer text-sm font-black text-purple-800">
                      Normalized Data
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-700">
                      {JSON.stringify(row.normalized_payload, null, 2)}
                    </pre>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
