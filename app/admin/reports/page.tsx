"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title_tc: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  gallery_image_urls: string[] | null;
  registration_url: string | null;
  official_url: string | null;
  source_url: string | null;
  merchant_id: string | null;
  is_featured: boolean | null;
};

type MerchantRow = { id: string; status: string | null; business_name: string | null };
type IntakeRow = { id: string; status: string; source_type: string; received_at: string };
type SyncRow = { id: string; status: string; rows_read: number; error_count: number; started_at: string; message: string | null };
type SimpleStatus = { id: string; status: string | null };
type BannerRow = {
  id: string;
  status: string | null;
  placement: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

function hkToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function countBy(rows: Array<{ status: string | null }>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function Metric({ label, value, note, tone = "slate" }: { label: string; value: number; note: string; tone?: "slate" | "amber" | "rose" | "emerald" | "purple" }) {
  const classes = {
    slate: "border-slate-200 bg-white",
    amber: "border-amber-200 bg-amber-50",
    rose: "border-rose-200 bg-rose-50",
    emerald: "border-emerald-200 bg-emerald-50",
    purple: "border-purple-200 bg-purple-50",
  };
  return (
    <article className={"rounded-3xl border p-5 shadow-sm " + classes[tone]}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{note}</p>
    </article>
  );
}

export default function AdminReportsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [syncs, setSyncs] = useState<SyncRow[]>([]);
  const [articles, setArticles] = useState<SimpleStatus[]>([]);
  const [social, setSocial] = useState<SimpleStatus[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  async function load() {
    if (!supabase) {
      setErrorText("Supabase client 未初始化。");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorText("");

    const results = await Promise.all([
      supabase.from("events").select("id,title_tc,status,start_date,end_date,cover_image_url,gallery_image_urls,registration_url,official_url,source_url,merchant_id,is_featured").limit(5000),
      supabase.from("merchants").select("id,status,business_name").limit(1000),
      supabase.from("intake_submissions").select("id,status,source_type,received_at").order("received_at", { ascending: false }).limit(2000),
      supabase.from("data_sync_runs").select("id,status,rows_read,error_count,started_at,message").order("started_at", { ascending: false }).limit(200),
      supabase.from("content_articles").select("id,status").limit(1000),
      supabase.from("social_content_drafts").select("id,status").limit(2000),
      supabase.from("promo_banners").select("id,status,placement,starts_at,ends_at").limit(1000),
    ]);

    const firstError = results.find((result) => result.error)?.error;
    if (firstError) setErrorText(firstError.message);

    setEvents((results[0].data || []) as EventRow[]);
    setMerchants((results[1].data || []) as MerchantRow[]);
    setIntakes((results[2].data || []) as IntakeRow[]);
    setSyncs((results[3].data || []) as SyncRow[]);
    setArticles((results[4].data || []) as SimpleStatus[]);
    setSocial((results[5].data || []) as SimpleStatus[]);
    setBanners((results[6].data || []) as BannerRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const report = useMemo(() => {
    const today = hkToday();
    const published = events.filter((event) => event.status === "published");
    const expiredPublished = published.filter(
      (event) => Boolean(event.end_date && event.end_date < today),
    );
    const expiredFeatured = events.filter(
      (event) =>
        event.is_featured === true &&
        Boolean((event.end_date || event.start_date) && (event.end_date || event.start_date)! < today),
    );
    const missingDate = events.filter((event) => !event.start_date);
    const missingImage = events.filter(
      (event) =>
        !event.cover_image_url &&
        (!Array.isArray(event.gallery_image_urls) || event.gallery_image_urls.length === 0),
    );
    const missingLink = events.filter((event) => !event.registration_url && !event.official_url && !event.source_url);
    const pendingMerchants = merchants.filter((merchant) => merchant.status === "pending");
    const intakeAttention = intakes.filter((row) => ["new", "needs_review"].includes(row.status));
    const failedSyncs = syncs.filter((row) => row.status === "failed" || row.error_count > 0);
    const socialBacklog = social.filter((row) => ["draft", "ready"].includes(row.status || ""));
    const publishedFeatured = published.filter((event) => event.is_featured === true);
    const nowIso = new Date().toISOString();
    const activeHomeTopBanners = banners.filter(
      (banner) =>
        banner.placement === "home_top" &&
        banner.status === "active" &&
        (!banner.starts_at || banner.starts_at <= nowIso) &&
        (!banner.ends_at || banner.ends_at >= nowIso),
    );
    const latestSync = syncs[0] || null;

    return {
      today,
      eventStatus: countBy(events),
      merchantStatus: countBy(merchants),
      articleStatus: countBy(articles),
      socialStatus: countBy(social),
      bannerStatus: countBy(banners),
      published: published.length,
      expiredPublished,
      expiredFeatured,
      missingDate,
      missingImage,
      missingLink,
      pendingMerchants,
      intakeAttention,
      failedSyncs,
      socialBacklog,
      publishedFeatured,
      activeHomeTopBanners,
      latestSync,
    };
  }, [events, merchants, intakes, syncs, articles, social, banners]);

  function downloadSnapshot() {
    const payload = {
      generated_at: new Date().toISOString(),
      hong_kong_date: report.today,
      events: report.eventStatus,
      merchants: report.merchantStatus,
      content_articles: report.articleStatus,
      social_drafts: report.socialStatus,
      promo_banners: report.bannerStatus,
      qa: {
        expired_published: report.expiredPublished.length,
        expired_featured: report.expiredFeatured.length,
        missing_date: report.missingDate.length,
        missing_image: report.missingImage.length,
        missing_external_link: report.missingLink.length,
        intake_attention: report.intakeAttention.length,
        failed_syncs: report.failedSyncs.length,
        homepage_featured: report.publishedFeatured.length,
        active_home_top_banners: report.activeHomeTopBanners.length,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hk-family-fun-admin-report-" + report.today + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <Link href="/admin" className="text-sm font-black text-purple-700">← 返回 Admin</Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-purple-700">ADMIN REPORTS</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">營運報表 / QA Exceptions</h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                唔需要逐版巡網站。呢度集中顯示最值得你處理嘅異常：資料缺漏、過期公開、同步錯誤、待審資料同 Social backlog。
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void load()} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700">重新整理</button>
              <button type="button" onClick={downloadSnapshot} disabled={loading} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Export Snapshot</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] space-y-7 px-4 py-8">
        {errorText ? <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800">{errorText}</div> : null}
        {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">整理報表中…</div> : null}

        {!loading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Events" value={events.length} note={"Published " + report.published + " · Draft " + (report.eventStatus.draft || 0)} tone="purple" />
              <Metric label="Intake Attention" value={report.intakeAttention.length} note="New / needs review" tone={report.intakeAttention.length ? "amber" : "emerald"} />
              <Metric label="Expired but Published" value={report.expiredPublished.length} note="應優先封存或檢查 recurring 設定" tone={report.expiredPublished.length ? "rose" : "emerald"} />
              <Metric label="Expired Featured" value={report.expiredFeatured.length} note="已過期但仍標記首頁精選" tone={report.expiredFeatured.length ? "amber" : "emerald"} />
              <Metric label="Failed Sync" value={report.failedSyncs.length} note="最近 200 次 sync" tone={report.failedSyncs.length ? "rose" : "emerald"} />
              <Metric label="Missing Date" value={report.missingDate.length} note="無開始日期嘅 Event" tone={report.missingDate.length ? "amber" : "emerald"} />
              <Metric label="Missing Image" value={report.missingImage.length} note="無 cover image" tone={report.missingImage.length ? "amber" : "emerald"} />
              <Metric label="Missing Link" value={report.missingLink.length} note="無報名 / 官網 / source URL" tone={report.missingLink.length ? "amber" : "emerald"} />
              <Metric
                label="Homepage Banner"
                value={report.activeHomeTopBanners.length}
                note="首頁最高橫額 active inventory"
                tone={report.activeHomeTopBanners.length ? "emerald" : "rose"}
              />
              <Metric
                label="Featured Slots"
                value={report.publishedFeatured.length}
                note="建議維持 3–4 個精選活動，桌面版保持一排"
                tone={report.publishedFeatured.length >= 3 ? "emerald" : "amber"}
              />
              <Metric label="Social Backlog" value={report.socialBacklog.length} note="Draft / Ready 未完成" tone="slate" />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">內容狀態</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Events", report.eventStatus],
                    ["Merchants", report.merchantStatus],
                    ["News / Feature", report.articleStatus],
                    ["Social", report.socialStatus],
                    ["Banners", report.bannerStatus],
                  ].map(([label, values]) => (
                    <div key={label as string} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">{label as string}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(values as Record<string, number>).length ? Object.entries(values as Record<string, number>).map(([status, count]) => (
                          <span key={status} className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                            {status}: {count}
                          </span>
                        )) : <span className="text-xs font-bold text-slate-400">No data</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Sync / 自動化</h2>
                {report.latestSync ? (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm font-black text-slate-900">Latest sync: {report.latestSync.status}</p>
                    <p className="mt-2 text-sm text-slate-600">Rows read: {report.latestSync.rows_read} · Errors: {report.latestSync.error_count}</p>
                    {report.latestSync.message ? <p className="mt-2 text-xs font-semibold text-slate-500">{report.latestSync.message}</p> : null}
                  </div>
                ) : <p className="mt-5 text-sm text-slate-500">尚未有 sync 記錄。</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/admin/operations" className="rounded-full bg-purple-700 px-4 py-2 text-xs font-black text-white">Operations Hub</Link>
                  <Link href="/admin/intake" className="rounded-full border border-purple-200 px-4 py-2 text-xs font-black text-purple-700">Data Inbox</Link>
                  <Link href="/admin/system" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">System Health</Link>
                </div>
              </section>
            </div>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">優先處理清單</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {report.expiredPublished.slice(0, 12).map((event) => (
                  <Link key={event.id} href={"/admin/events/" + event.id} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black uppercase text-rose-600">Expired Published</p>
                    <p className="mt-2 font-black text-slate-950">{event.title_tc || event.id}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{event.start_date || "No date"} → {event.end_date || event.start_date || "No date"}</p>
                  </Link>
                ))}
                {report.expiredFeatured.slice(0, 8).map((event) => (
                  <Link key={"featured-" + event.id} href={"/admin/events/" + event.id} className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                    <p className="text-[10px] font-black uppercase text-purple-700">Expired Featured</p>
                    <p className="mt-2 font-black text-slate-950">{event.title_tc || event.id}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">請取消「首頁精選」或更新活動日期。</p>
                  </Link>
                ))}
                {report.missingImage.slice(0, 6).map((event) => (
                  <Link key={"img-" + event.id} href={"/admin/events/" + event.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[10px] font-black uppercase text-amber-700">Missing Image</p>
                    <p className="mt-2 font-black text-slate-950">{event.title_tc || event.id}</p>
                  </Link>
                ))}
              </div>
              {!report.expiredPublished.length && !report.expiredFeatured.length && !report.missingImage.length ? (
                <p className="mt-5 text-sm font-bold text-emerald-700">目前冇高優先 Event QA exception。</p>
              ) : null}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
