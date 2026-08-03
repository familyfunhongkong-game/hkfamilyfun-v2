"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type DraftEvent = {
  source_url: string;
  title_tc: string;
  short_description_tc: string;
  description_tc: string;
  activity_category: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  address: string;
  area: string;
  district: string;
  mtr_station: string;
  price_display_mode: string;
  price_label: string;
  min_price: string;
  max_price: string;
  original_price: string;
  offer_price: string;
  quota_label: string;
  cta_type: string;
  cta_label: string;
  registration_url: string;
  booking_url: string;
  official_url: string;
  google_map_url: string;
  google_map_embed_url: string;
  cover_image_url: string;
  gallery_image_urls: string[];
  organizer_name: string;
  tags: string;
  highlights: string;
  terms: string;
  remarks: string;
  extraction_notes: string[];
};

type MerchantRecord = {
  id: string;
  business_name?: string | null;
  contact_email?: string | null;
  status?: string | null;
};

const emptyDraft: DraftEvent = {
  source_url: "",
  title_tc: "",
  short_description_tc: "",
  description_tc: "",
  activity_category: "親子活動",
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  venue_name: "",
  address: "",
  area: "",
  district: "",
  mtr_station: "",
  price_display_mode: "unknown",
  price_label: "",
  min_price: "",
  max_price: "",
  original_price: "",
  offer_price: "",
  quota_label: "",
  cta_type: "official",
  cta_label: "查看官方活動頁",
  registration_url: "",
  booking_url: "",
  official_url: "",
  google_map_url: "",
  google_map_embed_url: "",
  cover_image_url: "",
  gallery_image_urls: ["", "", "", "", ""],
  organizer_name: "",
  tags: "",
  highlights: "",
  terms: "",
  remarks: "",
  extraction_notes: [],
};

const priceModes = [
  { key: "unknown", title: "收費待確認", desc: "未確認收費，需商戶補充。" },
  { key: "hidden", title: "不顯示價錢", desc: "只作宣傳，不公開價錢。" },
  { key: "free", title: "免費", desc: "活動免費參加。" },
  { key: "fixed", title: "固定價", desc: "例如 HK$50。" },
  { key: "early_bird", title: "優惠 / 早鳥", desc: "例如 HK$50（原價 HK$90）。" },
  { key: "range", title: "價錢範圍", desc: "例如 HK$50–HK$180。" },
  { key: "quota", title: "只顯示名額", desc: "不顯示價錢，只顯示名額安排。" },
];

const ctaTypes = [
  { key: "official", title: "官方活動頁", label: "查看官方活動頁" },
  { key: "external", title: "外部連結報名", label: "前往報名" },
  { key: "google_form", title: "Google Form", label: "Google Form 報名" },
  { key: "whatsapp", title: "WhatsApp", label: "WhatsApp 報名" },
  { key: "none", title: "無需報名", label: "無需報名" },
  { key: "contact", title: "向主辦查詢", label: "請向主辦查詢" },
];

function safeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function updateArrayItem(items: string[], index: number, value: string) {
  const next = [...items];
  next[index] = value;
  return next;
}

function normalizeImages(images: string[]) {
  return Array.from(
    new Set(images.map((item) => item.trim()).filter(Boolean))
  ).slice(0, 5);
}

function formatPricePreview(draft: DraftEvent) {
  const mode = draft.price_display_mode;

  if (mode === "hidden") return "不顯示價錢";
  if (mode === "free") return "免費";
  if (mode === "quota") return draft.quota_label || "只顯示名額";
  if (draft.price_label) return draft.price_label;

  if (mode === "early_bird") {
    if (draft.offer_price && draft.original_price) {
      return `早鳥優惠價 HK$${draft.offer_price}（原價 HK$${draft.original_price}）`;
    }
    if (draft.offer_price) return `早鳥優惠價 HK$${draft.offer_price}`;
  }

  if (mode === "range") {
    if (draft.min_price && draft.max_price) {
      if (draft.min_price === draft.max_price) return `HK$${draft.min_price}`;
      return `HK$${draft.min_price}–HK$${draft.max_price}`;
    }
    if (draft.min_price) return `HK$${draft.min_price} 起`;
  }

  if (mode === "fixed") {
    if (draft.min_price) return `HK$${draft.min_price}`;
  }

  return "收費待確認";
}

function getCtaPreview(draft: DraftEvent) {
  if (draft.cta_label) return draft.cta_label;

  const selected = ctaTypes.find((item) => item.key === draft.cta_type);
  return selected?.label || "查看詳情";
}

function readyScore(draft: DraftEvent) {
  const checks = [
    safeText(draft.title_tc),
    safeText(draft.start_date),
    safeText(draft.venue_name) || safeText(draft.address),
    formatPricePreview(draft) !== "收費待確認",
    getCtaPreview(draft) !== "",
    safeText(draft.cover_image_url) || normalizeImages(draft.gallery_image_urls).length > 0,
    safeText(draft.google_map_url) || safeText(draft.google_map_embed_url),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ImportEventPage() {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<DraftEvent>(emptyDraft);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const score = useMemo(() => readyScore(draft), [draft]);

  function updateField<K extends keyof DraftEvent>(key: K, value: DraftEvent[K]) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function loadMerchant() {
    const client = supabase;

    if (!client) {
      setMessage("Supabase client 未能初始化，請檢查 .env.local。");
      return null;
    }

    setLoadingMerchant(true);

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      setMessage("請先登入商戶帳戶，再建立活動草稿。");
      setLoadingMerchant(false);
      return null;
    }

    const { data, error } = await client
      .from("merchants")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (error) {
      setMessage(`讀取商戶資料失敗：${error.message}`);
      setLoadingMerchant(false);
      return null;
    }

    if (!data) {
      setMessage("此帳戶未連接商戶資料，請先完成商戶登記。");
      setLoadingMerchant(false);
      return null;
    }

    const currentMerchant = data as MerchantRecord;
    setMerchant(currentMerchant);
    setLoadingMerchant(false);
    return currentMerchant;
  }

  async function extractFromUrl() {
    const targetUrl = url.trim();

    if (!targetUrl) {
      setMessage("請先貼上活動網址。");
      return;
    }

    setExtracting(true);
    setMessage("");
    setSavedId(null);

    try {
      const response = await fetch("/api/import-event", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        setMessage(json.error || "未能抽取活動資料。");
        setExtracting(false);
        return;
      }

      const extracted = json.event as DraftEvent;
      const images = normalizeImages([
        extracted.cover_image_url,
        ...(extracted.gallery_image_urls || []),
      ]);

      setDraft({
        ...emptyDraft,
        ...extracted,
        source_url: extracted.source_url || targetUrl,
        official_url: extracted.official_url || targetUrl,
        registration_url: extracted.registration_url || extracted.booking_url || targetUrl,
        booking_url: extracted.booking_url || extracted.registration_url || targetUrl,
        gallery_image_urls: [
          images[0] || "",
          images[1] || "",
          images[2] || "",
          images[3] || "",
          images[4] || "",
        ],
        cover_image_url: extracted.cover_image_url || images[0] || "",
        extraction_notes: extracted.extraction_notes || [],
      });

      setMessage("已完成 server-side URL 抽取。請檢查資料後儲存草稿。");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "抽取活動資料時發生未知錯誤。"
      );
    }

    setExtracting(false);
  }

  async function saveDraft() {
    const client = supabase;

    if (!client) {
      setMessage("Supabase client 未能初始化，暫時不能儲存草稿。");
      return;
    }

    const currentMerchant = merchant || (await loadMerchant());
    if (!currentMerchant) return;

    setSaving(true);
    setMessage("");

    const gallery = normalizeImages([
      draft.cover_image_url,
      ...draft.gallery_image_urls,
    ]);

    const insertPayload = {
      merchant_id: currentMerchant.id,
      status: "draft",
      title_tc: draft.title_tc || "未命名活動草稿",
      title: draft.title_tc || "Untitled draft event",
      short_description_tc: draft.short_description_tc,
      description_tc: draft.description_tc,
      activity_category: draft.activity_category,
      category: draft.activity_category,
      start_date: draft.start_date || null,
      end_date: draft.end_date || draft.start_date || null,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      venue_name: draft.venue_name,
      address: draft.address,
      district: draft.district,
      mtr_station: draft.mtr_station,
      price_display_mode: draft.price_display_mode,
      price_label: formatPricePreview(draft),
      min_price: draft.min_price || null,
      max_price: draft.max_price || null,
      original_price: draft.original_price || null,
      offer_price: draft.offer_price || null,
      quota_label: draft.quota_label,
      cta_type: draft.cta_type,
      cta_label: getCtaPreview(draft),
      registration_url: draft.registration_url || draft.booking_url || draft.official_url || draft.source_url,
      booking_url: draft.booking_url || draft.registration_url || draft.official_url || draft.source_url,
      official_url: draft.official_url || draft.source_url,
      source_url: draft.source_url || url,
      google_map_url: draft.google_map_url,
      google_map_embed_url: draft.google_map_embed_url,
      cover_image_url: draft.cover_image_url || gallery[0] || "",
      gallery_image_urls: gallery,
      organizer_name: draft.organizer_name || currentMerchant.business_name || "",
      merchant_name: currentMerchant.business_name || "",
      tags: draft.tags,
      highlights: draft.highlights,
      terms: draft.terms,
      remarks: draft.remarks,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("events")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      setMessage(`儲存草稿失敗：${error.message}`);
      setSaving(false);
      return;
    }

    setSavedId(data?.id || null);
    setMessage("已儲存為活動草稿。你可以前往編輯頁繼續補資料，或到 Dashboard 查看。");
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8">
          <p className="text-sm font-black text-purple-700">
            Merchant Portal · 智能匯入活動
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            貼活動網址，自動建立可編輯草稿
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            系統會用 server-side API 讀取活動網頁，抽取活動名稱、描述、圖片、日期、
            地點、收費及 CTA。抽不到的資料會保留空白，讓商戶手動補充。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">1. 輸入活動網址</h2>
            <p className="mt-1 text-sm text-slate-500">
              支援商戶官網、商場活動頁、Google Form 或報名頁。
            </p>

            <textarea
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.airside.com.hk/zh-hk/happenings/manulife-wellbeing-fest"
              className="mt-4 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />

            <button
              type="button"
              onClick={extractFromUrl}
              disabled={extracting}
              className="mt-4 w-full rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
            >
              {extracting ? "正在抽取資料..." : "抽取活動資料"}
            </button>

            <button
              type="button"
              onClick={loadMerchant}
              disabled={loadingMerchant}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              {loadingMerchant ? "正在確認商戶..." : "確認商戶帳戶"}
            </button>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-black text-emerald-800">商戶狀態</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              {merchant
                ? `已連接：${merchant.business_name || "未命名商戶"}`
                : "尚未確認。儲存草稿前系統會自動檢查登入商戶。"}
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-black text-blue-900">系統備註</p>
            {draft.extraction_notes.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-blue-900">
                {draft.extraction_notes.map((note, index) => (
                  <li key={`${note}-${index}`}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-blue-900">
                貼上網址後，這裡會顯示抽取結果及需要人工確認的地方。
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {message ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {message}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black text-purple-700">即時草稿 Preview</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {draft.title_tc || "未命名活動草稿"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {draft.short_description_tc || "抽取後會顯示活動簡介。"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                完整度 {score}%
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PreviewItem label="日期" value={draft.start_date || "未填"} />
              <PreviewItem label="地點" value={draft.venue_name || draft.address || "未填"} />
              <PreviewItem label="收費" value={formatPricePreview(draft)} />
              <PreviewItem label="CTA" value={getCtaPreview(draft)} />
            </div>
          </div>

          <FormSection title="2. 基本活動資料">
            <Input label="活動名稱" value={draft.title_tc} onChange={(value) => updateField("title_tc", value)} />
            <Input label="活動分類" value={draft.activity_category} onChange={(value) => updateField("activity_category", value)} />
            <Input label="開始日期" type="date" value={draft.start_date} onChange={(value) => updateField("start_date", value)} />
            <Input label="結束日期" type="date" value={draft.end_date} onChange={(value) => updateField("end_date", value)} />
            <Input label="開始時間" type="time" value={draft.start_time} onChange={(value) => updateField("start_time", value)} />
            <Input label="結束時間" type="time" value={draft.end_time} onChange={(value) => updateField("end_time", value)} />
          </FormSection>

          <FormSection title="3. 地點及交通">
            <Input label="場地名稱" value={draft.venue_name} onChange={(value) => updateField("venue_name", value)} />
            <Input label="詳細地址" value={draft.address} onChange={(value) => updateField("address", value)} />
            <Input label="地區" value={draft.area} onChange={(value) => updateField("area", value)} />
            <Input label="分區" value={draft.district} onChange={(value) => updateField("district", value)} />
            <Input label="港鐵站" value={draft.mtr_station} onChange={(value) => updateField("mtr_station", value)} />
            <Input label="Google Map URL" value={draft.google_map_url} onChange={(value) => updateField("google_map_url", value)} />
            <Input label="Google Map Embed URL" value={draft.google_map_embed_url} onChange={(value) => updateField("google_map_embed_url", value)} />
          </FormSection>

          <FormSection title="4. 收費、優惠及名額">
            <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
              {priceModes.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => updateField("price_display_mode", mode.key)}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    draft.price_display_mode === mode.key
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <p className="font-black text-slate-950">{mode.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{mode.desc}</p>
                </button>
              ))}
            </div>

            <Input label="公開價錢摘要" value={draft.price_label} onChange={(value) => updateField("price_label", value)} />
            <Input label="最低 / 固定收費 HK$" value={draft.min_price} onChange={(value) => updateField("min_price", value)} />
            <Input label="最高收費 HK$" value={draft.max_price} onChange={(value) => updateField("max_price", value)} />
            <Input label="優惠價 HK$" value={draft.offer_price} onChange={(value) => updateField("offer_price", value)} />
            <Input label="原價 HK$" value={draft.original_price} onChange={(value) => updateField("original_price", value)} />
            <Input label="名額摘要" value={draft.quota_label} onChange={(value) => updateField("quota_label", value)} />
          </FormSection>

          <FormSection title="5. 報名 CTA">
            <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
              {ctaTypes.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => {
                    updateField("cta_type", type.key);
                    updateField("cta_label", type.label);
                  }}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    draft.cta_type === type.key
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <p className="font-black text-slate-950">{type.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{type.label}</p>
                </button>
              ))}
            </div>

            <Input label="CTA 按鈕文字" value={draft.cta_label} onChange={(value) => updateField("cta_label", value)} />
            <Input label="報名 URL" value={draft.registration_url} onChange={(value) => updateField("registration_url", value)} />
            <Input label="Booking URL" value={draft.booking_url} onChange={(value) => updateField("booking_url", value)} />
            <Input label="官方活動頁" value={draft.official_url} onChange={(value) => updateField("official_url", value)} />
          </FormSection>

          <FormSection title="6. 圖片 URL（最多 5 張）">
            <Input label="封面圖片 URL" value={draft.cover_image_url} onChange={(value) => updateField("cover_image_url", value)} />
            {draft.gallery_image_urls.map((image, index) => (
              <Input
                key={index}
                label={`Gallery 圖片 ${index + 1}`}
                value={image}
                onChange={(value) =>
                  updateField("gallery_image_urls", updateArrayItem(draft.gallery_image_urls, index, value))
                }
              />
            ))}

            {normalizeImages([draft.cover_image_url, ...draft.gallery_image_urls]).length ? (
              <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {normalizeImages([draft.cover_image_url, ...draft.gallery_image_urls]).map((image) => (
                  <div key={image} className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img src={image} alt="活動圖片" className="h-full w-full object-contain" />
                  </div>
                ))}
              </div>
            ) : null}
          </FormSection>

          <FormSection title="7. 活動內容">
            <Textarea label="短簡介" value={draft.short_description_tc} onChange={(value) => updateField("short_description_tc", value)} />
            <Textarea label="詳細介紹" value={draft.description_tc} onChange={(value) => updateField("description_tc", value)} />
            <Textarea label="活動亮點（一行一項）" value={draft.highlights} onChange={(value) => updateField("highlights", value)} />
            <Textarea label="注意事項（一行一項）" value={draft.terms} onChange={(value) => updateField("terms", value)} />
            <Textarea label="備註" value={draft.remarks} onChange={(value) => updateField("remarks", value)} />
            <Input label="主辦方" value={draft.organizer_name} onChange={(value) => updateField("organizer_name", value)} />
            <Input label="標籤" value={draft.tags} onChange={(value) => updateField("tags", value)} />
          </FormSection>

          <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">
                  {draft.title_tc || "未命名活動草稿"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  完整度 {score}% · 儲存後可到編輯頁再補圖片、裁圖及提交審批
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {savedId ? (
                  <>
                    <Link
                      href={`/merchant/events/${savedId}/edit`}
                      className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                    >
                      前往編輯
                    </Link>
                    <Link
                      href={`/merchant/events/${savedId}/preview`}
                      className="rounded-full border border-purple-300 bg-purple-50 px-5 py-3 text-sm font-black text-purple-700 hover:bg-purple-100"
                    >
                      Preview
                    </Link>
                  </>
                ) : null}

                <Link
                  href="/merchant/dashboard"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  返回 Dashboard
                </Link>

                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving}
                  className="rounded-full bg-purple-700 px-6 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:bg-slate-300"
                >
                  {saving ? "正在儲存..." : "儲存為活動草稿"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}