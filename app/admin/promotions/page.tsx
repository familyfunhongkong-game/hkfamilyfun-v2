"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { canActivatePromotion } from "@/lib/business-model";

type Status = "draft" | "active" | "paused" | "archived";
type Placement = "home_top" | "home_middle" | "events_top" | "news_top" | "article_inline";

type Banner = {
  id: string;
  internal_name: string;
  placement: Placement;
  status: Status;
  headline_tc: string;
  headline_sc: string | null;
  headline_en: string | null;
  subheadline_tc: string | null;
  subheadline_sc: string | null;
  subheadline_en: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  target_url: string | null;
  cta_label_tc: string | null;
  cta_label_sc: string | null;
  cta_label_en: string | null;
  badge_text_tc: string | null;
  badge_text_sc: string | null;
  badge_text_en: string | null;
  sponsor_name: string | null;
  is_paid: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
};

type Draft = Omit<Banner, "id" | "updated_at">;

type BannerAnalytics = {
  impressions: number;
  clicks: number;
};

const emptyDraft: Draft = {
  internal_name: "",
  placement: "home_top",
  status: "draft",
  headline_tc: "",
  headline_sc: "",
  headline_en: "",
  subheadline_tc: "",
  subheadline_sc: "",
  subheadline_en: "",
  image_url: "",
  mobile_image_url: "",
  target_url: "",
  cta_label_tc: "了解更多",
  cta_label_sc: "了解更多",
  cta_label_en: "Learn more",
  badge_text_tc: "",
  badge_text_sc: "",
  badge_text_en: "",
  sponsor_name: "",
  is_paid: false,
  priority: 100,
  starts_at: "",
  ends_at: "",
};

const placementLabels: Record<Placement, string> = {
  home_top: "首頁最頂橫額 Banner",
  home_middle: "首頁活動區中段",
  events_top: "搜尋活動頁頂部",
  news_top: "News / Feature 頂部",
  article_inline: "News 文章底部／內文",
};

function fromLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function toIso(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTime(value: string | null) {
  if (!value) return "不限";
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

export default function AdminPromotionsPage() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<"image_url" | "mobile_image_url" | "">("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [placementFilter, setPlacementFilter] = useState<"all" | Placement>("all");
  const [analytics, setAnalytics] = useState<Record<string, BannerAnalytics>>({});

  async function loadRows() {
    if (!supabase) {
      setErrorText("Supabase client 未初始化。");
      setLoading(false);
      return;
    }

    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [bannerResult, analyticsResult] = await Promise.all([
      supabase
        .from("promo_banners")
        .select("*")
        .order("priority", { ascending: true })
        .order("updated_at", { ascending: false }),
      supabase
        .from("promotion_events")
        .select("banner_id,event_type")
        .gte("occurred_at", since)
        .limit(50000),
    ]);

    if (bannerResult.error) {
      setRows([]);
      setErrorText(
        bannerResult.error.message.toLowerCase().includes("promo_banners")
          ? "Promotion Banner schema 尚未套用到 Supabase。"
          : bannerResult.error.message,
      );
    } else {
      setRows((bannerResult.data || []) as Banner[]);
      setErrorText("");
    }

    if (!analyticsResult.error) {
      const next: Record<string, BannerAnalytics> = {};
      for (const event of analyticsResult.data || []) {
        const bannerId = String(event.banner_id || "");
        if (!bannerId) continue;
        const current = next[bannerId] || { impressions: 0, clicks: 0 };
        if (event.event_type === "impression") current.impressions += 1;
        if (event.event_type === "click") current.clicks += 1;
        next[bannerId] = current;
      }
      setAnalytics(next);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  const shown = useMemo(
    () =>
      placementFilter === "all"
        ? rows
        : rows.filter((row) => row.placement === placementFilter),
    [rows, placementFilter],
  );

  function edit(row: Banner) {
    setEditingId(row.id);
    setDraft({
      internal_name: row.internal_name,
      placement: row.placement,
      status: row.status,
      headline_tc: row.headline_tc || "",
      headline_sc: row.headline_sc || "",
      headline_en: row.headline_en || "",
      subheadline_tc: row.subheadline_tc || "",
      subheadline_sc: row.subheadline_sc || "",
      subheadline_en: row.subheadline_en || "",
      image_url: row.image_url || "",
      mobile_image_url: row.mobile_image_url || "",
      target_url: row.target_url || "",
      cta_label_tc: row.cta_label_tc || "",
      cta_label_sc: row.cta_label_sc || "",
      cta_label_en: row.cta_label_en || "",
      badge_text_tc: row.badge_text_tc || "",
      badge_text_sc: row.badge_text_sc || "",
      badge_text_en: row.badge_text_en || "",
      sponsor_name: row.sponsor_name || "",
      is_paid: Boolean(row.is_paid),
      priority: Number(row.priority || 100),
      starts_at: fromLocalInput(row.starts_at),
      ends_at: fromLocalInput(row.ends_at),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId("");
    setDraft(emptyDraft);
    setMessage("");
    setErrorText("");
  }

  async function uploadBannerImage(
    file: File,
    field: "image_url" | "mobile_image_url",
  ) {
    if (!supabase) return;

    if (!file.type.startsWith("image/")) {
      setErrorText("只接受圖片檔案。");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorText("Banner 圖片不可超過 8MB。");
      return;
    }

    setUploadingField(field);
    setErrorText("");

    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const path = `admin/${Date.now()}-${safeName || "banner"}`;

    const { error } = await supabase.storage
      .from("promo-banners")
      .upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (error) {
      setErrorText(error.message || "Banner 圖片上傳失敗。");
      setUploadingField("");
      return;
    }

    const publicUrl = supabase.storage
      .from("promo-banners")
      .getPublicUrl(path).data.publicUrl;

    setDraft((current) => ({ ...current, [field]: publicUrl }));
    setUploadingField("");
    setMessage(field === "image_url" ? "Desktop Banner 圖片已上傳。" : "Mobile Banner 圖片已上傳。");
  }

  function promoStoragePath(url: string | null) {
    const value = String(url || "");
    const marker = "/storage/v1/object/public/promo-banners/";
    const index = value.indexOf(marker);
    if (index < 0) return "";
    return decodeURIComponent(value.slice(index + marker.length));
  }

  async function deleteBanner(row: Banner) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `確定永久刪除 Banner「${row.headline_tc || row.internal_name}」？此操作不能復原。`,
    );
    if (!confirmed) return;

    setSaving(true);
    setErrorText("");
    setMessage("");

    const { error } = await supabase
      .from("promo_banners")
      .delete()
      .eq("id", row.id);

    if (error) {
      setErrorText(error.message || "Banner 刪除失敗。");
      setSaving(false);
      return;
    }

    const storagePaths = [row.image_url, row.mobile_image_url]
      .map(promoStoragePath)
      .filter(Boolean);

    if (storagePaths.length) {
      const unique = [...new Set(storagePaths)];
      const { error: storageError } = await supabase.storage
        .from("promo-banners")
        .remove(unique);
      if (storageError) {
        console.warn("Banner row deleted but image cleanup failed:", storageError);
      }
    }

    if (editingId === row.id) reset();
    setSaving(false);
    setMessage("Banner 已永久刪除。");
    await loadRows();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    if (!draft.internal_name.trim() || !draft.headline_tc.trim() || !draft.image_url?.trim()) {
      setErrorText("請輸入內部名稱、繁中標題及 Banner 圖片 URL。");
      return;
    }

    const startsAt = toIso(draft.starts_at);
    const endsAt = toIso(draft.ends_at);
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setErrorText("結束時間必須遲過開始時間。");
      return;
    }

    if (
      draft.status === "active" &&
      !canActivatePromotion({
        is_paid: draft.is_paid,
        sponsor_name: draft.sponsor_name,
      })
    ) {
      setErrorText(
        "商戶廣告未確認收費，不可以直接 Active。請先確認付款並勾選「已確認收到廣告費」。HK Family Fun 自家宣傳除外。",
      );
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessage("");

    const payload = {
      ...draft,
      internal_name: draft.internal_name.trim(),
      title: draft.headline_tc.trim(),
      subtitle: draft.subheadline_tc?.trim() || null,
      link_url:
        draft.target_url?.trim() && /^https?:\/\//i.test(draft.target_url.trim())
          ? draft.target_url.trim()
          : null,
      sort_order: Number(draft.priority || 100),
      headline_tc: draft.headline_tc.trim(),
      headline_sc: draft.headline_sc?.trim() || null,
      headline_en: draft.headline_en?.trim() || null,
      subheadline_tc: draft.subheadline_tc?.trim() || null,
      subheadline_sc: draft.subheadline_sc?.trim() || null,
      subheadline_en: draft.subheadline_en?.trim() || null,
      image_url: draft.image_url?.trim() || null,
      mobile_image_url: draft.mobile_image_url?.trim() || null,
      target_url: draft.target_url?.trim() || null,
      cta_label_tc: draft.cta_label_tc?.trim() || null,
      cta_label_sc: draft.cta_label_sc?.trim() || null,
      cta_label_en: draft.cta_label_en?.trim() || null,
      badge_text_tc: draft.badge_text_tc?.trim() || null,
      badge_text_sc: draft.badge_text_sc?.trim() || null,
      badge_text_en: draft.badge_text_en?.trim() || null,
      sponsor_name: draft.sponsor_name?.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
      priority: Number(draft.priority || 100),
      updated_at: new Date().toISOString(),
    };

    const response = editingId
      ? await supabase
          .from("promo_banners")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .single()
      : await supabase
          .from("promo_banners")
          .insert(payload)
          .select("id")
          .single();

    setSaving(false);

    if (response.error) {
      setErrorText(response.error.message);
      return;
    }

    setMessage(editingId ? "Banner 已更新。" : "Banner 草稿已建立。");
    reset();
    await loadRows();
  }

  async function setStatus(id: string, status: Status) {
    if (!supabase) return;

    if (status === "active") {
      const row = rows.find((item) => item.id === id);
      if (row && !canActivatePromotion(row)) {
        setErrorText(
          "未確認付款的商戶廣告不能啟用。先確認收款，再勾選「已確認收到廣告費」。",
        );
        return;
      }
    }

    const { error } = await supabase
      .from("promo_banners")
      .update({ status, updated_at: new Date().toISOString() })
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
            Promotion Manager
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Banner / 商戶廣告管理
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            一般活動 Listing 永久同廣告收費分開：活動資料上載不收費；Banner / Featured / Sponsored 屬付費曝光。商戶廣告要先確認付款先可以 Active；可預先設定上架及落架時間。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-8 xl:grid-cols-[500px_minmax(0,1fr)]">
        <form onSubmit={save} className="self-start rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">
              {editingId ? "編輯 Banner" : "新增 Banner"}
            </h2>
            {editingId ? (
              <button type="button" onClick={reset} className="text-xs font-black text-slate-500">
                取消編輯
              </button>
            ) : null}
          </div>

          {message ? <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div> : null}
          {errorText ? <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{errorText}</div> : null}

          <div className="mt-5 grid gap-4">
            <label className="text-xs font-black text-slate-600">
              內部 Campaign 名稱 *
              <input required value={draft.internal_name} onChange={(event) => setDraft({ ...draft, internal_name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-slate-600">
                Placement
                <select value={draft.placement} onChange={(event) => setDraft({ ...draft, placement: event.target.value as Placement })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                  {Object.entries(placementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-600">
                Status
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <label className="text-xs font-black text-slate-600">
              繁中標題 *
              <input required value={draft.headline_tc} onChange={(event) => setDraft({ ...draft, headline_tc: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <label className="text-xs font-black text-slate-600">
              繁中副標題
              <textarea value={draft.subheadline_tc || ""} onChange={(event) => setDraft({ ...draft, subheadline_tc: event.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                簡體標題
                <input value={draft.headline_sc || ""} onChange={(event) => setDraft({ ...draft, headline_sc: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-black text-slate-600">
                English headline
                <input value={draft.headline_en || ""} onChange={(event) => setDraft({ ...draft, headline_en: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-xs font-black text-slate-600">
                Desktop / default image URL *
                <input
                  value={draft.image_url || ""}
                  onChange={(event) => setDraft({ ...draft, image_url: event.target.value })}
                  placeholder="https://... 或 /logo.png"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">
                {draft.placement === "home_top"
                  ? "首頁最頂橫額建議使用約 5:1 橫向圖片，例如 1500×300；重要文字及 Logo 請放中央安全範圍。"
                  : "建議使用清晰橫向圖片，避免把重要文字貼近四邊。"}
              </p>
              <label className="mt-3 block text-xs font-black text-purple-700">
                或直接 Upload Banner 圖
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={Boolean(uploadingField)}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadBannerImage(file, "image_url");
                    event.currentTarget.value = "";
                  }}
                  className="mt-2 block w-full text-xs font-semibold text-slate-600"
                />
              </label>
              {uploadingField === "image_url" ? (
                <p className="mt-2 text-xs font-bold text-purple-700">上傳中…</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-xs font-black text-slate-600">
                Mobile image URL（可選）
                <input
                  value={draft.mobile_image_url || ""}
                  onChange={(event) => setDraft({ ...draft, mobile_image_url: event.target.value })}
                  placeholder="https://... 或站內圖片路徑"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">
                Mobile 可另外上載較高比例版本；如留空，系統會沿用 Desktop 圖並自動裁切。
              </p>
              <label className="mt-3 block text-xs font-black text-purple-700">
                或 Upload Mobile Banner
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={Boolean(uploadingField)}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadBannerImage(file, "mobile_image_url");
                    event.currentTarget.value = "";
                  }}
                  className="mt-2 block w-full text-xs font-semibold text-slate-600"
                />
              </label>
              {uploadingField === "mobile_image_url" ? (
                <p className="mt-2 text-xs font-bold text-purple-700">上傳中…</p>
              ) : null}
            </div>

            <label className="text-xs font-black text-slate-600">
              Click-through URL
              <input value={draft.target_url || ""} onChange={(event) => setDraft({ ...draft, target_url: event.target.value })} placeholder="https://... 或 /merchant-join" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                CTA
                <input value={draft.cta_label_tc || ""} onChange={(event) => setDraft({ ...draft, cta_label_tc: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-black text-slate-600">
                Badge
                <input value={draft.badge_text_tc || ""} onChange={(event) => setDraft({ ...draft, badge_text_tc: event.target.value })} placeholder="例如：限時 / 精選" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
            </div>

            <label className="text-xs font-black text-slate-600">
              Sponsor / Merchant
              <input value={draft.sponsor_name || ""} onChange={(event) => setDraft({ ...draft, sponsor_name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                開始時間
                <input type="datetime-local" value={draft.starts_at || ""} onChange={(event) => setDraft({ ...draft, starts_at: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-black text-slate-600">
                結束時間
                <input type="datetime-local" value={draft.ends_at || ""} onChange={(event) => setDraft({ ...draft, ends_at: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
            </div>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                <input type="checkbox" checked={draft.is_paid} onChange={(event) => setDraft({ ...draft, is_paid: event.target.checked })} />
                已確認收到廣告費 / Sponsored
              </label>
              <label className="text-xs font-black text-slate-600">
                Priority
                <input type="number" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </label>
            </div>

            <button disabled={saving} className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              {saving ? "儲存中…" : editingId ? "更新 Banner" : "建立 Banner"}
            </button>
          </div>
        </form>

        <section>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPlacementFilter("all")} className={placementFilter === "all" ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"}>全部</button>
            {(Object.keys(placementLabels) as Placement[]).map((placement) => (
              <button key={placement} type="button" onClick={() => setPlacementFilter(placement)} className={placementFilter === placement ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white" : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"}>{placementLabels[placement]}</button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">讀取中…</div>
            ) : shown.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">暫時沒有 Banner。</div>
            ) : (
              shown.map((row) => (
                <article key={row.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                  <div className="grid sm:grid-cols-[230px_minmax(0,1fr)]">
                    <div className="min-h-44 bg-slate-100">
                      <img src={row.image_url || "/api/brand/family-fun-logo"} alt={row.headline_tc} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-700">{placementLabels[row.placement]}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{row.status}</span>
                        {row.is_paid ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">Sponsored</span> : null}
                      </div>
                      <h2 className="mt-3 text-xl font-black text-slate-950">{row.headline_tc}</h2>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{row.internal_name}</p>
                      <p className="mt-3 text-xs leading-5 text-slate-500">上架：{formatTime(row.starts_at)} · 落架：{formatTime(row.ends_at)} · Priority {row.priority}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase text-slate-400">30日曝光</p>
                          <p className="mt-1 text-lg font-black text-slate-950">{analytics[row.id]?.impressions || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase text-slate-400">30日點擊</p>
                          <p className="mt-1 text-lg font-black text-slate-950">{analytics[row.id]?.clicks || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase text-slate-400">CTR</p>
                          <p className="mt-1 text-lg font-black text-slate-950">
                            {analytics[row.id]?.impressions
                              ? ((analytics[row.id]!.clicks / analytics[row.id]!.impressions) * 100).toFixed(1) + "%"
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => edit(row)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">編輯</button>
                        {row.status !== "active" ? <button type="button" onClick={() => void setStatus(row.id, "active")} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white">啟用</button> : <button type="button" onClick={() => void setStatus(row.id, "paused")} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800">暫停</button>}
                        {row.status !== "archived" ? <button type="button" onClick={() => void setStatus(row.id, "archived")} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">封存</button> : null}
                        <button
                          type="button"
                          onClick={() => void deleteBanner(row)}
                          disabled={saving}
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 disabled:opacity-50"
                        >
                          永久刪除
                        </button>
                      </div>
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
