"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Placement = "home_top" | "home_mid" | "events_top" | "event_detail";
type BannerStatus = "draft" | "active" | "paused" | "archived";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  placement: Placement;
  status: BannerStatus;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
};

type FormState = {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  placement: Placement;
  status: BannerStatus;
  starts_at: string;
  ends_at: string;
  sort_order: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  placement: "home_mid",
  status: "draft",
  starts_at: "",
  ends_at: "",
  sort_order: "0",
};

const placementLabels: Record<Placement, string> = {
  home_top: "首頁頂部",
  home_mid: "首頁中段",
  events_top: "活動搜尋頁",
  event_detail: "活動詳情頁",
};

function toHongKongInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function hongKongInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getBannerStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/promo-banners/";
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function formatHongKongDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  async function loadBanners() {
    const client = supabase;
    if (!client) return;

    const { data, error } = await client
      .from("promo_banners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setBanners((data || []) as Banner[]);
  }

  useEffect(() => {
    void loadBanners();
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorText("");
    setMessage("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorText("只接受 JPG、PNG 或 WebP 圖片。");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorText("Banner 圖片不可超過 8MB。");
      event.target.value = "";
      return;
    }

    const client = supabase;
    if (!client) {
      setErrorText("Supabase 未連接。");
      return;
    }

    setBusy(true);

    const { data: userData } = await client.auth.getUser();
    const user = userData.user;

    if (!user) {
      setErrorText("Admin 登入已失效，請重新登入。");
      setBusy(false);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const { error: uploadError } = await client.storage
      .from("promo-banners")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setErrorText(uploadError.message);
      setBusy(false);
      return;
    }

    const { data } = client.storage.from("promo-banners").getPublicUrl(path);
    updateField("image_url", data.publicUrl);
    setMessage("圖片已上載，可以預覽後儲存。");
    setBusy(false);
    event.target.value = "";
  }

  async function saveBanner(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;

    setBusy(true);
    setErrorText("");
    setMessage("");

    if (!form.title.trim() || !form.image_url.trim()) {
      setErrorText("標題及 Banner 圖片必須填寫。");
      setBusy(false);
      return;
    }

    if (form.starts_at && form.ends_at && new Date(form.ends_at) < new Date(form.starts_at)) {
      setErrorText("結束時間不可早過開始時間。");
      setBusy(false);
      return;
    }

    const { data: userData } = await client.auth.getUser();
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim() || null,
      placement: form.placement,
      status: form.status,
      starts_at: hongKongInputToIso(form.starts_at),
      ends_at: hongKongInputToIso(form.ends_at),
      sort_order: Number(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    const previousBanner = editingId
      ? banners.find((banner) => banner.id === editingId) || null
      : null;

    const result = editingId
      ? await client.from("promo_banners").update(payload).eq("id", editingId)
      : await client.from("promo_banners").insert({
          ...payload,
          created_by: userData.user?.id || null,
        });

    if (result.error) {
      setErrorText(result.error.message);
      setBusy(false);
      return;
    }

    if (
      previousBanner &&
      previousBanner.image_url !== payload.image_url
    ) {
      const oldPath = getBannerStoragePath(previousBanner.image_url);
      if (oldPath) {
        const { error: cleanupError } = await client.storage
          .from("promo-banners")
          .remove([oldPath]);

        if (cleanupError) {
          console.warn("Old banner image cleanup failed:", cleanupError);
        }
      }
    }

    setMessage(editingId ? "Banner 已更新。" : "Banner 已建立。");
    setForm(EMPTY_FORM);
    setEditingId(null);
    await loadBanners();
    setBusy(false);
  }

  function editBanner(banner: Banner) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      placement: banner.placement,
      status: banner.status,
      starts_at: toHongKongInput(banner.starts_at),
      ends_at: toHongKongInput(banner.ends_at),
      sort_order: String(banner.sort_order || 0),
    });
    setMessage("");
    setErrorText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeStatus(id: string, status: BannerStatus) {
    const client = supabase;
    if (!client) return;
    setBusy(true);
    const { error } = await client
      .from("promo_banners")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setErrorText(error.message);
    else await loadBanners();
    setBusy(false);
  }

  async function deleteBanner(id: string) {
    if (!window.confirm("確定刪除此 Banner？此動作不能還原。")) return;
    const client = supabase;
    if (!client) return;
    setBusy(true);
    const target = banners.find((banner) => banner.id === id) || null;
    const { error } = await client.from("promo_banners").delete().eq("id", id);

    if (error) {
      setErrorText(error.message);
    } else {
      const storagePath = getBannerStoragePath(target?.image_url);
      if (storagePath) {
        const { error: cleanupError } = await client.storage
          .from("promo-banners")
          .remove([storagePath]);

        if (cleanupError) {
          console.warn("Banner image cleanup failed:", cleanupError);
        }
      }

      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      await loadBanners();
      setMessage("Banner 已刪除。");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8">
          <p className="text-sm font-black text-purple-700">HK Family Fun Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Banner 管理</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            自主管理合作 Banner：上載圖片、設定位置、連結、開始／結束時間及發布狀態。到期後公開網站會自動停止顯示。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={saveBanner} className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">{editingId ? "編輯 Banner" : "建立 Banner"}</h2>
            {editingId ? (
              <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }} className="text-xs font-black text-slate-500">
                取消編輯
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-black text-slate-700">
              標題 *
              <input value={form.title} onChange={(e) => updateField("title", e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-purple-500" />
            </label>

            <label className="grid gap-1.5 text-sm font-black text-slate-700">
              副標題
              <textarea value={form.subtitle} onChange={(e) => updateField("subtitle", e.target.value)} rows={3} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-purple-500" />
            </label>

            <label className="grid gap-1.5 text-sm font-black text-slate-700">
              Banner 圖片 *
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={busy} className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-medium" />
              <span className="text-xs font-medium text-slate-400">JPG / PNG / WebP，最多 8MB。建議 1600×600 或相同比例。</span>
            </label>

            {form.image_url ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img src={form.image_url} alt="Banner preview" className="aspect-[8/3] w-full object-cover" />
              </div>
            ) : null}

            <label className="grid gap-1.5 text-sm font-black text-slate-700">
              目的連結
              <input type="url" value={form.link_url} onChange={(e) => updateField("link_url", e.target.value)} placeholder="https://..." className="rounded-2xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-purple-500" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-black text-slate-700">
                顯示位置
                <select value={form.placement} onChange={(e) => updateField("placement", e.target.value as Placement)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
                  {Object.entries(placementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-black text-slate-700">
                狀態
                <select value={form.status} onChange={(e) => updateField("status", e.target.value as BannerStatus)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
                  <option value="draft">草稿</option>
                  <option value="active">啟用</option>
                  <option value="paused">暫停</option>
                  <option value="archived">封存</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-black text-slate-700">
                開始時間（香港時間）
                <input type="datetime-local" value={form.starts_at} onChange={(e) => updateField("starts_at", e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium" />
              </label>
              <label className="grid gap-1.5 text-sm font-black text-slate-700">
                結束時間（香港時間）
                <input type="datetime-local" value={form.ends_at} onChange={(e) => updateField("ends_at", e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium" />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-black text-slate-700">
              排序
              <input type="number" value={form.sort_order} onChange={(e) => updateField("sort_order", e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3 font-medium" />
            </label>

            {errorText ? <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{errorText}</p> : null}
            {message ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}

            <button type="submit" disabled={busy} className="rounded-2xl bg-purple-700 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">
              {busy ? "處理中..." : editingId ? "儲存修改" : "建立 Banner"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-700">Inventory</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">現有 Banner</h2>
            </div>
            <span className="text-sm font-black text-slate-500">{banners.length} 個</span>
          </div>

          {banners.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">未有 Banner。</div>
          ) : banners.map((banner) => (
            <article key={banner.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <img src={banner.image_url} alt={banner.title} className="aspect-[8/3] w-full object-cover" />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">{placementLabels[banner.placement]}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{banner.status}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950">{banner.title}</h3>
                    {banner.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{banner.subtitle}</p> : null}
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
                  {banner.starts_at ? `開始：${formatHongKongDateTime(banner.starts_at)} HKT` : "立即開始"} · {banner.ends_at ? `結束：${formatHongKongDateTime(banner.ends_at)} HKT` : "無結束日期"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editBanner(banner)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-black text-slate-700">編輯</button>
                  {banner.status === "active" ? (
                    <button type="button" onClick={() => changeStatus(banner.id, "paused")} disabled={busy} className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black text-amber-800">暫停</button>
                  ) : (
                    <button type="button" onClick={() => changeStatus(banner.id, "active")} disabled={busy} className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-800">啟用</button>
                  )}
                  <button type="button" onClick={() => deleteBanner(banner.id)} disabled={busy} className="rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700">刪除</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
