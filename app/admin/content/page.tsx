"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type ArticleStatus = "draft" | "review" | "published" | "archived";
type ArticleType = "news" | "feature" | "guide" | "sponsored";

type Article = {
  id: string;
  slug: string;
  article_type: ArticleType;
  status: ArticleStatus;
  title_tc: string;
  title_sc: string | null;
  title_en: string | null;
  excerpt_tc: string | null;
  excerpt_sc: string | null;
  excerpt_en: string | null;
  body_tc: string | null;
  body_sc: string | null;
  body_en: string | null;
  cover_image_url: string | null;
  source_url: string | null;
  sponsor_name: string | null;
  is_sponsored: boolean;
  featured: boolean;
  ai_notes: string | null;
  published_at: string | null;
  updated_at: string;
};

type Draft = Omit<Article, "id" | "published_at" | "updated_at">;

const emptyDraft: Draft = {
  slug: "",
  article_type: "news",
  status: "draft",
  title_tc: "",
  title_sc: "",
  title_en: "",
  excerpt_tc: "",
  excerpt_sc: "",
  excerpt_en: "",
  body_tc: "",
  body_sc: "",
  body_en: "",
  cover_image_url: "",
  source_url: "",
  sponsor_name: "",
  is_sponsored: false,
  featured: false,
  ai_notes: "",
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
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

export default function AdminContentPage() {
  const [rows, setRows] = useState<Article[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [filter, setFilter] = useState<"all" | ArticleStatus>("all");

  async function loadRows() {
    if (!supabase) {
      setErrorText("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("content_articles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setRows([]);
      setErrorText(
        error.message.toLowerCase().includes("content_articles")
          ? "News / Feature schema 尚未套用到 Supabase。"
          : error.message,
      );
    } else {
      setRows((data || []) as Article[]);
      setErrorText("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  const shown = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.status === filter)),
    [rows, filter],
  );

  function edit(row: Article) {
    setEditingId(row.id);
    setDraft({
      slug: row.slug || "",
      article_type: row.article_type,
      status: row.status,
      title_tc: row.title_tc || "",
      title_sc: row.title_sc || "",
      title_en: row.title_en || "",
      excerpt_tc: row.excerpt_tc || "",
      excerpt_sc: row.excerpt_sc || "",
      excerpt_en: row.excerpt_en || "",
      body_tc: row.body_tc || "",
      body_sc: row.body_sc || "",
      body_en: row.body_en || "",
      cover_image_url: row.cover_image_url || "",
      source_url: row.source_url || "",
      sponsor_name: row.sponsor_name || "",
      is_sponsored: Boolean(row.is_sponsored),
      featured: Boolean(row.featured),
      ai_notes: row.ai_notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId("");
    setDraft(emptyDraft);
    setMessage("");
    setErrorText("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const slug = toSlug(draft.slug || draft.title_en || draft.title_tc);
    if (!slug || !draft.title_tc.trim()) {
      setErrorText("請至少輸入繁中標題及有效 slug。");
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessage("");

    const payload = {
      ...draft,
      slug,
      title_tc: draft.title_tc.trim(),
      title_sc: draft.title_sc?.trim() || null,
      title_en: draft.title_en?.trim() || null,
      excerpt_tc: draft.excerpt_tc?.trim() || null,
      excerpt_sc: draft.excerpt_sc?.trim() || null,
      excerpt_en: draft.excerpt_en?.trim() || null,
      body_tc: draft.body_tc?.trim() || null,
      body_sc: draft.body_sc?.trim() || null,
      body_en: draft.body_en?.trim() || null,
      cover_image_url: draft.cover_image_url?.trim() || null,
      source_url: draft.source_url?.trim() || null,
      sponsor_name: draft.sponsor_name?.trim() || null,
      ai_notes: draft.ai_notes?.trim() || null,
      updated_at: new Date().toISOString(),
      published_at:
        draft.status === "published"
          ? rows.find((row) => row.id === editingId)?.published_at || new Date().toISOString()
          : null,
    };

    const response = editingId
      ? await supabase
          .from("content_articles")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .single()
      : await supabase
          .from("content_articles")
          .insert(payload)
          .select("id")
          .single();

    setSaving(false);

    if (response.error) {
      setErrorText(response.error.message);
      return;
    }

    setMessage(editingId ? "文章已更新。" : "文章草稿已建立。");
    reset();
    await loadRows();
  }

  async function archive(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("content_articles")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setErrorText(error.message);
      return;
    }
    await loadRows();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <Link href="/admin" className="text-sm font-black text-purple-700">
            ← 返回 Admin
          </Link>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-purple-700">
            Editorial CMS
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            News / Feature 內容管理
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            建立類似生活媒體嘅圖片主導專題頁。活動 Listing 仍然保持資料型；News / Feature 負責完整故事、圖片、重點介紹及可標示 Sponsored 合作內容。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-8 xl:grid-cols-[520px_minmax(0,1fr)]">
        <form onSubmit={save} className="self-start rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">
              {editingId ? "編輯文章" : "新增文章草稿"}
            </h2>
            {editingId ? (
              <button type="button" onClick={reset} className="text-xs font-black text-slate-500">
                取消編輯
              </button>
            ) : null}
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div>
          ) : null}
          {errorText ? (
            <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{errorText}</div>
          ) : null}

          <div className="mt-5 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-slate-600">
                類型
                <select
                  value={draft.article_type}
                  onChange={(event) => setDraft({ ...draft, article_type: event.target.value as ArticleType })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="news">News</option>
                  <option value="feature">Feature</option>
                  <option value="guide">Guide</option>
                  <option value="sponsored">Sponsored</option>
                </select>
              </label>
              <label className="text-xs font-black text-slate-600">
                狀態
                <select
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as ArticleStatus })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <label className="text-xs font-black text-slate-600">
              繁中標題 *
              <input
                required
                value={draft.title_tc}
                onChange={(event) => setDraft({ ...draft, title_tc: event.target.value, slug: draft.slug || toSlug(event.target.value) })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="text-xs font-black text-slate-600">
              URL Slug *
              <input
                required
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: toSlug(event.target.value) })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                簡體標題
                <input value={draft.title_sc || ""} onChange={(event) => setDraft({ ...draft, title_sc: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-black text-slate-600">
                English title
                <input value={draft.title_en || ""} onChange={(event) => setDraft({ ...draft, title_en: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
            </div>

            <label className="text-xs font-black text-slate-600">
              繁中摘要
              <textarea value={draft.excerpt_tc || ""} onChange={(event) => setDraft({ ...draft, excerpt_tc: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <label className="text-xs font-black text-slate-600">
              繁中正文
              <textarea value={draft.body_tc || ""} onChange={(event) => setDraft({ ...draft, body_tc: event.target.value })} className="mt-2 min-h-52 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <label className="text-xs font-black text-slate-600">
              Cover image URL
              <input type="url" value={draft.cover_image_url || ""} onChange={(event) => setDraft({ ...draft, cover_image_url: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <label className="text-xs font-black text-slate-600">
              Official / source URL
              <input type="url" value={draft.source_url || ""} onChange={(event) => setDraft({ ...draft, source_url: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <label className="text-xs font-black text-slate-600">
              Sponsor / Partner
              <input value={draft.sponsor_name || ""} onChange={(event) => setDraft({ ...draft, sponsor_name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />
                Featured
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={draft.is_sponsored} onChange={(event) => setDraft({ ...draft, is_sponsored: event.target.checked })} />
                Sponsored
              </label>
            </div>

            <label className="text-xs font-black text-slate-600">
              AI / 編輯備註
              <textarea value={draft.ai_notes || ""} onChange={(event) => setDraft({ ...draft, ai_notes: event.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <button disabled={saving} className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              {saving ? "儲存中…" : editingId ? "更新文章" : "建立草稿"}
            </button>
          </div>
        </form>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(["all", "draft", "review", "published", "archived"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={[
                    "rounded-full px-4 py-2 text-xs font-black",
                    filter === item ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600",
                  ].join(" ")}
                >
                  {item}
                </button>
              ))}
            </div>
            <Link href="/news" target="_blank" className="text-sm font-black text-purple-700">
              查看公開 News →
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">讀取中…</div>
            ) : shown.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">暫時沒有文章。</div>
            ) : (
              shown.map((row) => (
                <article key={row.id} className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[170px_minmax(0,1fr)]">
                  <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                    <img src={row.cover_image_url || "/logo.png"} alt={row.title_tc} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">{row.article_type}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{row.status}</span>
                      {row.is_sponsored ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">Sponsored</span> : null}
                    </div>
                    <h2 className="mt-3 text-xl font-black text-slate-950">{row.title_tc}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{row.excerpt_tc || "未有摘要"}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-400">更新：{formatTime(row.updated_at)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => edit(row)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">編輯</button>
                      {row.status === "published" ? (
                        <Link href={"/news/" + row.slug} target="_blank" className="rounded-full border border-purple-200 px-4 py-2 text-xs font-black text-purple-700">公開頁</Link>
                      ) : null}
                      {row.status !== "archived" ? (
                        <button type="button" onClick={() => void archive(row.id)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">封存</button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
