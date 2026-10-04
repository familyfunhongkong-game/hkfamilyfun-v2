"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title_tc: string | null;
  status: string | null;
  start_date: string | null;
};

type ArticleRow = {
  id: string;
  title_tc: string | null;
  status: string | null;
};

type SocialDraft = {
  id: string;
  source_event_id: string | null;
  source_article_id: string | null;
  channel: "instagram" | "facebook" | "threads" | "all";
  status: "draft" | "ready" | "posted" | "archived";
  title: string | null;
  copy_text: string;
  image_brief: string | null;
  generated_by_ai: boolean;
  scheduled_for: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
};

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

export default function AdminSocialPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [drafts, setDrafts] = useState<SocialDraft[]>([]);
  const [sourceType, setSourceType] = useState<"event" | "article">("event");
  const [sourceId, setSourceId] = useState("");
  const [channel, setChannel] = useState<"instagram" | "facebook" | "threads" | "all">("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function loadData() {
    if (!supabase) {
      setErrorText("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    setLoading(true);

    const [eventResult, articleResult, draftResult] = await Promise.all([
      supabase
        .from("events")
        .select("id,title_tc,status,start_date")
        .in("status", ["approved", "published"])
        .order("start_date", { ascending: false })
        .limit(80),
      supabase
        .from("content_articles")
        .select("id,title_tc,status")
        .in("status", ["review", "published"])
        .order("updated_at", { ascending: false })
        .limit(80),
      supabase
        .from("social_content_drafts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (eventResult.error) setErrorText(eventResult.error.message);
    setEvents((eventResult.data || []) as EventRow[]);

    if (!articleResult.error) {
      setArticles((articleResult.data || []) as ArticleRow[]);
    }

    if (!draftResult.error) {
      setDrafts((draftResult.data || []) as SocialDraft[]);
    } else if (draftResult.error.message.toLowerCase().includes("social_content_drafts")) {
      setErrorText("Social Draft schema 尚未套用到 Supabase。");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const sources = sourceType === "event" ? events : articles;

  const readyCount = useMemo(
    () => drafts.filter((draft) => draft.status === "ready").length,
    [drafts],
  );

  async function generate() {
    if (!sourceId || !supabase) {
      setErrorText("請先選擇活動或文章。");
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setErrorText("請先登入 Admin。");
      return;
    }

    setGenerating(true);
    setErrorText("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/social-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          source_type: sourceType,
          source_id: sourceId,
          channel,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setErrorText(body.error || "未能生成 Social Draft。");
      } else {
        setMessage(
          body.generated_by_ai
            ? "AI Social Draft 已建立，請核對後再發布。"
            : "Social Draft 已建立。目前未設定 AI API，所以使用安全模板生成；資料不會被虛構。",
        );
        await loadData();
      }
    } catch {
      setErrorText("Social Draft API 暫時無法連接。");
    }

    setGenerating(false);
  }

  async function updateDraft(
    id: string,
    patch: Partial<Pick<SocialDraft, "copy_text" | "status" | "scheduled_for" | "posted_at">>,
  ) {
    if (!supabase) return;

    const { error } = await supabase
      .from("social_content_drafts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id
          ? { ...draft, ...patch, updated_at: new Date().toISOString() }
          : draft,
      ),
    );
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("文案已複製，可以直接貼到社交媒體。");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8">
          <Link href="/admin" className="text-sm font-black text-purple-700">
            ← 返回 Admin
          </Link>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-purple-700">
            Social Content Factory
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            FB / IG / Threads 草稿
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            重用已核實嘅 Event / News 資料生成文案。AI 只負責改寫及排版，日期、價錢、地點等事實以 Supabase 為準；任何草稿都唔會自動出 Post。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
              草稿 {drafts.length}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              Ready {readyCount}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="rounded-[2rem] border border-purple-200 bg-purple-50 p-5">
          <div className="grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)_180px_160px] lg:items-end">
            <label className="text-xs font-black text-purple-950">
              來源
              <select
                value={sourceType}
                onChange={(event) => {
                  setSourceType(event.target.value as "event" | "article");
                  setSourceId("");
                }}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-3 text-sm"
              >
                <option value="event">Event</option>
                <option value="article">News / Feature</option>
              </select>
            </label>

            <label className="text-xs font-black text-purple-950">
              選擇內容
              <select
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-3 text-sm"
              >
                <option value="">請選擇…</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title_tc || source.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-black text-purple-950">
              Channel
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value as typeof channel)}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-3 text-sm"
              >
                <option value="all">通用版</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="threads">Threads</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating || !sourceId}
              className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {generating ? "生成中…" : "生成草稿"}
            </button>
          </div>
        </div>

        {message ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div> : null}
        {errorText ? <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800">{errorText}</div> : null}

        <div className="mt-6 space-y-5">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">讀取中…</div>
          ) : drafts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
              暫時沒有 Social Draft。
            </div>
          ) : (
            drafts.map((draft) => (
              <article key={draft.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">{draft.channel}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{draft.status}</span>
                      <span className={draft.generated_by_ai ? "rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500"}>
                        {draft.generated_by_ai ? "AI" : "SAFE TEMPLATE"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-black text-slate-950">{draft.title || "Social Draft"}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-400">建立：{formatTime(draft.created_at)}</p>
                  </div>
                  <button type="button" onClick={() => void copyText(draft.copy_text)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                    Copy
                  </button>
                </div>

                <textarea
                  value={draft.copy_text}
                  onChange={(event) => setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, copy_text: event.target.value } : item))}
                  onBlur={() => void updateDraft(draft.id, { copy_text: draft.copy_text })}
                  className="mt-5 min-h-64 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                />

                {draft.image_brief ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-400">IMAGE BRIEF</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{draft.image_brief}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {draft.status === "draft" ? (
                    <button type="button" onClick={() => void updateDraft(draft.id, { status: "ready" })} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white">
                      標記 Ready
                    </button>
                  ) : null}
                  {draft.status !== "posted" ? (
                    <button type="button" onClick={() => void updateDraft(draft.id, { status: "posted", posted_at: new Date().toISOString() })} className="rounded-full border border-purple-200 px-4 py-2 text-xs font-black text-purple-700">
                      已 Post
                    </button>
                  ) : null}
                  {draft.status !== "archived" ? (
                    <button type="button" onClick={() => void updateDraft(draft.id, { status: "archived" })} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">
                      封存
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
