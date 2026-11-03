"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ImageQueueEvent = {
  id: string;
  title_tc: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  source_url: string | null;
  cover_image_url: string | null;
  description_tc: string | null;
  updated_at: string | null;
};
type Filter = "all" | "library" | "source-needed";
const badCover = (src?: string | null) =>
  !src?.trim() || /(?:fa-eye\.svg|favicon|logo\.|placeholder|no-image)/i.test(src);

function hasEventSource(url?: string | null) {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return path.length > 5 && !["/tc", "/en", "/zh", "/zh-hk", "/home", "/index", "/events"].includes(path);
  } catch { return false; }
}
function safeSource(url?: string | null) {
  if (!url) return "";
  try {
    const src = new URL(url);
    return ["https:", "http:"].includes(src.protocol) && !src.username && !src.password ? src.href : "";
  } catch { return ""; }
}
function promptFor(event: ImageQueueEvent) {
  return [
    "Create an original child-friendly 16:9 illustration for HK Family Fun event card.",
    "Subject: " + (event.title_tc || "香港親子活動") + ".",
    "Source context: " + (event.description_tc || "").slice(0, 220) + ".",
    "Depict the event topic, NOT an invented documentary photograph.",
    "No organiser logos, copyrighted characters, fake venue details, prices or dates.",
    "Place a small legible Traditional Chinese label 'AI 示意圖' at bottom-right.",
    "Keep clear safe margins for event-card badges and use crisp professional colours.",
  ].join(" ");
}
function todayInHongKong() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export default function AdminEventImageQaPage() {
  const [all, setAll] = useState<ImageQueueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [includeEnded, setIncludeEnded] = useState(false);
  const [checkedSource, setCheckedSource] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const today = todayInHongKong();

  const load = useCallback(async () => {
    setLoading(true);
    setProblem("");
    const client = supabase;
    if (!client) { setProblem("Supabase 未設定。"); setLoading(false); return; }
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) { setProblem("請先登入 Admin 帳戶。"); setLoading(false); return; }
    const { data: allowed, error: roleError } = await client.rpc("is_platform_admin");
    if (roleError || allowed !== true) {
      setProblem("此頁只限獲授權管理員查看。");
      setLoading(false);
      return;
    }
    const { data, error } = await client.from("events")
      .select("id,title_tc,status,start_date,end_date,source_url,cover_image_url,description_tc,updated_at")
      .in("status", ["draft", "submitted", "approved"])
      .order("start_date", { ascending: true })
      .limit(400);
    if (error) setProblem("無法載入待辦：" + error.message);
    else setAll(((data || []) as ImageQueueEvent[]).filter((event) => badCover(event.cover_image_url)));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => all.filter((event) => {
    if (!includeEnded && (event.end_date || event.start_date || "") < today) return false;
    if (filter === "library" && !/hkpl\.gov\.hk/i.test(event.source_url || "")) return false;
    if (filter === "source-needed" && hasEventSource(event.source_url)) return false;
    return !query.trim() || (event.title_tc || "").toLowerCase().includes(query.trim().toLowerCase());
  }), [all, filter, includeEnded, query, today]);

  const needExactSource = all.filter((event) => !hasEventSource(event.source_url)).length;
  const library = all.filter((event) => /hkpl\.gov\.hk/i.test(event.source_url || "")).length;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/admin" className="text-sm font-bold text-purple-700">← 返回 Admin</Link>
        <div className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-purple-700">IMAGE QUALITY CONTROL</p>
          <h1 className="mt-2 text-3xl font-black">活動圖片待辦中心</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            一個人營運優先處理即將舉行活動：先睇原活動網址，查有冇真正活動海報。
            沒有專屬圖片才製作有「AI 示意圖」標籤的原創封面，最後上載到活動草稿，交 Admin 審批。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-xl bg-amber-50 p-3 text-amber-800">缺封面／無效圖：{all.length}</span>
            <span className="rounded-xl bg-sky-50 p-3 text-sky-800">HKPL：{library}</span>
            <span className="rounded-xl bg-rose-50 p-3 text-rose-800">缺活動專屬網址：{needExactSource}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋活動名稱" aria-label="搜尋活動名稱"
            className="min-w-40 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}
            aria-label="圖片待辦分類" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="all">全部缺圖</option>
            <option value="library">香港公共圖書館</option>
            <option value="source-needed">需補活動專屬網址</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={includeEnded} onChange={(event) => setIncludeEnded(event.target.checked)}/>
            包括已過期
          </label>
          <button type="button" onClick={() => void load()}
            className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white">重新整理</button>
        </div>
        {problem ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{problem}</p> : null}
        {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}
        {loading ? <p className="text-sm text-slate-600">正在載入活動圖片待辦…</p> : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-600">目前顯示 {rows.length} 筆 · 優先按活動日期排序</p>
            {rows.map((event) => {
              const source = safeSource(event.source_url);
              const specific = hasEventSource(source);
              const checked = checkedSource[event.id] === true;
              return (
                <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-black text-slate-950">{event.title_tc || "未命名活動"}</h2>
                      <p className="mt-1 text-xs text-slate-600">
                        {event.start_date || "日期待確認"} – {event.end_date || event.start_date || "待確認"} · {event.status}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${specific ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>
                      {specific ? "官方圖片待核對" : "需補活動專屬連結"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {source ? <a href={source} target="_blank" rel="noopener noreferrer"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold">查看原活動網址 ↗</a> : null}
                    <Link href={`/admin/events/${event.id}/edit`}
                      className="rounded-xl bg-purple-700 px-3 py-2 text-xs font-bold text-white">
                      編輯／上載封面
                    </Link>
                    <Link href={`/admin/events/${event.id}`}
                      className="rounded-xl border border-purple-200 px-3 py-2 text-xs font-bold text-purple-800">
                      審批資料
                    </Link>
                  </div>
                  {specific ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={checked} onChange={(e) =>
                          setCheckedSource((prev) => ({ ...prev, [event.id]: e.target.checked }))} />
                        我已核對官方活動詳情頁，確定沒有適用、獲授權的活動專屬圖片
                      </label>
                      {checked ? (
                        <button type="button" onClick={async () => {
                          try { await navigator.clipboard.writeText(promptFor(event)); setNotice("已複製 AI 示意圖 Prompt；請生成後上載，並交 Admin 審批。"); }
                          catch { setNotice("無法複製；請檢查瀏覽器剪貼簿權限。"); }
                        }} className="mt-3 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">
                          複製活動專用 AI 圖片 Prompt（含 AI 示意圖標籤）
                        </button>
                      ) : <p className="mt-2 text-xs text-slate-500">尚未確認來源前，不提供一鍵 AI 封面操作。</p>}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-rose-700">
                      現有網址可能只是機構首頁，請先改成該活動嘅官方詳情頁，再查圖片；不可憑模糊來源生成假宣傳圖。
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
