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
  admin_review_note: string | null;
};
type ScanResult = { status: "official_candidate" | "ai_needed"; url: string; prompt: string; notes: string[] };
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
  const [checkingId, setCheckingId] = useState("");
  const [scans, setScans] = useState<Record<string, ScanResult>>({});
  const [allowedPicture, setAllowedPicture] = useState<Record<string, boolean>>({});
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
      .select("id,title_tc,status,start_date,end_date,source_url,cover_image_url,description_tc,updated_at,admin_review_note")
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


  async function inspectOfficialSource(event: ImageQueueEvent) {
    const source = safeSource(event.source_url);
    if (!hasEventSource(source) || !supabase) {
      setNotice("請先補齊官方活動詳情網址，唔好只用機構首頁。");
      return;
    }
    setCheckingId(event.id);
    setNotice("");
    try {
      const { data: session, error: authError } = await supabase.auth.getSession();
      if (authError || !session.session?.access_token) throw new Error("請重新登入 Admin。");
      const response = await fetch("/api/import-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.session.access_token,
        },
        body: JSON.stringify({ url: source }),
      });
      const result: {
        ok?: boolean;
        error?: string;
        event?: {
          image_source_status?: string;
          image_source_url?: string;
          ai_image_prompt?: string;
          extraction_notes?: string[];
        };
      } = await response.json();
      if (!response.ok || !result.ok || !result.event) throw new Error(result.error || "官方圖片搜尋失敗。");
      const url = safeSource(result.event.image_source_url);
      setScans((prev) => ({
        ...prev, [event.id]: {
          status: result.event?.image_source_status === "official_candidate" && url ? "official_candidate" : "ai_needed",
          url,
          prompt: result.event?.ai_image_prompt || promptFor(event),
          notes: result.event?.extraction_notes || [],
        },
      }));
      setAllowedPicture((prev) => ({ ...prev, [event.id]: false }));
      setCheckedSource((prev) => ({ ...prev, [event.id]: false }));
      setNotice(url ? "已從官方活動頁發現圖片候選，請檢查畫面及使用權限。" :
        "已掃描活動來源，未找到通過驗證的專屬圖片；請人工再核對一次。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "官方圖片搜尋無法完成。");
    } finally { setCheckingId(""); }
  }

  async function saveApprovedCandidate(event: ImageQueueEvent) {
    const found = scans[event.id];
    if (!supabase || !found?.url || found.status !== "official_candidate" ||
        allowedPicture[event.id] !== true || event.status !== "draft") {
      setNotice("必須先檢查官方圖片、確認使用權限，而且活動仍為草稿。");
      return;
    }
    setCheckingId(event.id);
    try {
      const { data: rights, error: roleError } = await supabase.rpc("is_platform_admin");
      if (roleError || rights !== true) throw new Error("管理員權限驗證失敗。");
      const marker = "[IMAGE QA] " + new Date().toISOString() +
        " Operator reviewed official event image relevance/permission from " +
        (event.source_url || "") + "; candidate: " + found.url +
        ". Stored on DRAFT only; publishing is a separate approval step.";
      const { data, error } = await supabase.from("events").update({
        cover_image_url: found.url,
        admin_review_note: [event.admin_review_note, marker].filter(Boolean).join("\n"),
        updated_at: new Date().toISOString(),
      }).eq("id", event.id).eq("status", "draft").select("id").maybeSingle();
      if (error || !data) throw new Error(error?.message || "草稿狀態已改變，未能儲存圖片。");
      setAll((prev) => prev.filter((item) => item.id !== event.id));
      setNotice("官方圖片候選已加入活動草稿並留下審核紀錄；未發布。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "無法儲存官方圖片候選。");
    } finally { setCheckingId(""); }
  }

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
                    {specific ? (
                      <button type="button" disabled={checkingId === event.id} onClick={() => void inspectOfficialSource(event)}
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-60">
                        {checkingId === event.id ? "正在掃描…" : "搜尋原活動圖片"}
                      </button>
                    ) : null}
                    <Link href={`/admin/events/${event.id}/edit`}
                      className="rounded-xl bg-purple-700 px-3 py-2 text-xs font-bold text-white">
                      編輯／上載封面
                    </Link>
                    <Link href={`/admin/events/${event.id}`}
                      className="rounded-xl border border-purple-200 px-3 py-2 text-xs font-bold text-purple-800">
                      審批資料
                    </Link>
                  </div>
                  {scans[event.id]?.status === "official_candidate" ? (
                    <section className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                      <p className="font-black text-emerald-900">已發現官方活動圖片候選（未經授權核實）</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scans[event.id].url} alt={event.title_tc || "待核對的活動圖片"}
                        className="mt-3 h-40 w-full rounded-xl bg-white object-contain sm:w-72" />
                      <a href={scans[event.id].url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 block break-all text-xs font-bold text-emerald-800 underline">
                        查看來源圖片 ↗
                      </a>
                      <label className="mt-3 flex items-start gap-2 text-xs font-bold text-emerald-900">
                        <input type="checkbox" checked={allowedPicture[event.id] === true}
                          onChange={(e) => setAllowedPicture((prev) => ({ ...prev, [event.id]: e.target.checked }))}/>
                        我確認圖片屬於呢個活動，而且擁有使用許可／符合來源授權要求
                      </label>
                      <button type="button" disabled={!allowedPicture[event.id] || checkingId === event.id || event.status !== "draft"}
                        onClick={() => void saveApprovedCandidate(event)}
                        className="mt-3 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                        保存圖片到 Draft（不發布）
                      </button>
                    </section>
                  ) : null}
                  {specific ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={checked} onChange={(e) =>
                          setCheckedSource((prev) => ({ ...prev, [event.id]: e.target.checked }))} />
                        我已核對官方活動詳情頁，確定沒有適用、獲授權的活動專屬圖片
                      </label>
                      {checked && scans[event.id]?.status === "ai_needed" ? (
                        <button type="button" onClick={async () => {
                          try { await navigator.clipboard.writeText(scans[event.id]?.prompt || promptFor(event)); setNotice("已複製 AI 示意圖 Prompt；請生成後上載，並交 Admin 審批。"); }
                          catch { setNotice("無法複製；請檢查瀏覽器剪貼簿權限。"); }
                        }} className="mt-3 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">
                          複製活動專用 AI 圖片 Prompt（含 AI 示意圖標籤）
                        </button>
                      ) : <p className="mt-2 text-xs text-slate-500">系統掃描及人工確認來源後，先可使用 AI 封面 Prompt。</p>}
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
