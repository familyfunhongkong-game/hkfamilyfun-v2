"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link as LinkIcon,
  Upload,
  Wand2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ImportMode = "url" | "file";

type AiExtractedEvent = {
  title_tc?: string;
  short_description_tc?: string;
  description_tc?: string;
  organizer_name?: string;
  venue_name?: string;
  address?: string;
  district?: string;
  mtr_station?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  price_type?: "free" | "paid" | "mixed" | "unknown";
  price_min?: number;
  price_max?: number;
  category?: string;
  tags?: string[];
  registration_required?: boolean;
  registration_url?: string;
  is_sen_friendly?: boolean;
  is_indoor?: boolean;
  confidence_score?: number;
  missing_fields?: string[];
  warning_notes?: string[];
};

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

function makeTitleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const lastPath = parsed.pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, " ")
      .replace(/_/g, " ");

    if (lastPath && lastPath.trim().length > 2) {
      return lastPath
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "URL 匯入活動草稿";
  }
}

function getSourceType(file: File | null, mode: ImportMode) {
  if (mode === "url") return "url";
  if (!file) return "file";

  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";

  return "file";
}

function getFallbackDraftInfo(params: {
  mode: ImportMode;
  sourceUrl: string;
  file: File | null;
  merchantName: string;
}) {
  const { mode, sourceUrl, file, merchantName } = params;

  if (mode === "url") {
    const title = makeTitleFromUrl(sourceUrl);

    return {
      title_tc: title,
      short_description_tc:
        "此活動由商戶提供連結匯入。AI 自動抽取暫未啟用，請商戶在提交前確認活動日期、時間、地點及收費。",
      description_tc:
        "此活動草稿已由活動來源連結建立。請商戶在預覽頁面確認及補充活動詳情，包括日期、時間、地點、收費、報名方法及注意事項。確認後可提交 HK Family Fun 審批。",
      organizer_name: merchantName,
      venue_name: "待商戶確認",
      address: "待商戶確認",
      district: "待確認",
      mtr_station: "待確認",
      category: "親子活動",
      tags: ["商戶匯入", "待確認", "親子活動"],
      price_type: "unknown" as const,
      price_min: 0,
      price_max: 0,
      registration_required: false,
      registration_url: sourceUrl,
      is_sen_friendly: false,
      is_indoor: false,
      confidence_score: 0.2,
      missing_fields: [
        "start_date",
        "end_date",
        "start_time",
        "end_time",
        "venue_name",
        "address",
        "price_type",
      ],
      warning_notes: [
        "目前未接駁 AI / OCR，自動欄位只作草稿用途。",
        "請商戶提交前必須確認日期、時間、地點、收費及報名資料。",
      ],
    };
  }

  const fileName = file?.name || "uploaded-file";
  const isPdf = file?.type === "application/pdf";
  const isImage = file?.type.startsWith("image/");

  return {
    title_tc: isImage
      ? `圖片匯入活動草稿（${fileName}）`
      : isPdf
        ? `PDF 匯入活動草稿（${fileName}）`
        : `檔案匯入活動草稿（${fileName}）`,
    short_description_tc:
      "此活動由商戶上載圖片 / PDF 建立草稿。AI 自動抽取暫未啟用或未成功，請商戶在提交前確認活動資料。",
    description_tc:
      "商戶已上載活動資料檔案。請在預覽頁面檢查及補充活動名稱、日期、時間、地點、收費、報名方法及家長注意事項。確認後可提交 HK Family Fun 審批。",
    organizer_name: merchantName,
    venue_name: "待商戶確認",
    address: "待商戶確認",
    district: "待確認",
    mtr_station: "待確認",
    category: "親子活動",
    tags: ["圖片匯入", "PDF匯入", "待確認", "親子活動"],
    price_type: "unknown" as const,
    price_min: 0,
    price_max: 0,
    registration_required: false,
    registration_url: "",
    is_sen_friendly: false,
    is_indoor: false,
    confidence_score: 0.1,
    missing_fields: [
      "title_tc",
      "start_date",
      "end_date",
      "start_time",
      "end_time",
      "venue_name",
      "address",
      "price_type",
      "registration_url",
    ],
    warning_notes: [
      "目前未有 OpenAI API key 或 AI extraction 未成功。",
      "系統已照樣建立 draft，避免商戶卡住流程。",
      "請商戶手動補齊重要活動資料。",
    ],
  };
}

async function tryAiExtractFromImage(
  file: File
): Promise<AiExtractedEvent | null> {
  try {
    if (!file.type.startsWith("image/")) {
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/merchant/events/extract", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result?.ok || !result?.extracted) {
      return null;
    }

    return result.extracted as AiExtractedEvent;
  } catch {
    return null;
  }
}

export default function MerchantEventImportPage() {
  const router = useRouter();

  const [mode, setMode] = useState<ImportMode>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedFileLabel = useMemo(() => {
    if (!sourceFile) return "未選擇檔案";
    return `${sourceFile.name} (${Math.round(sourceFile.size / 1024)} KB)`;
  }, [sourceFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSourceFile(file);
    setErrorMessage("");
    setStatusMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const trimmedUrl = sourceUrl.trim();

      if (mode === "url" && !trimmedUrl) {
        setErrorMessage("請先貼上活動來源連結。");
        setIsSubmitting(false);
        return;
      }

      if (mode === "file" && !sourceFile) {
        setErrorMessage("請先上載活動圖片或 PDF。");
        setIsSubmitting(false);
        return;
      }

      if (mode === "file" && sourceFile) {
        const allowedTypes = [
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/pdf",
        ];

        if (!allowedTypes.includes(sourceFile.type)) {
          setErrorMessage("暫時只支援 PNG、JPG、WEBP 或 PDF。");
          setIsSubmitting(false);
          return;
        }

        const maxSizeMb = 8;
        const maxSizeBytes = maxSizeMb * 1024 * 1024;

        if (sourceFile.size > maxSizeBytes) {
          setErrorMessage(`檔案太大。暫時最多支援 ${maxSizeMb}MB。`);
          setIsSubmitting(false);
          return;
        }
      }

      setStatusMessage("正在檢查商戶帳戶...");

      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsSubmitting(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/merchant/login");
        return;
      }

      const { data: merchant, error: merchantError } = await supabase
        .from("merchants")
        .select("id, business_name, contact_email, status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError || !merchant) {
        setErrorMessage("找不到商戶帳戶，請先完成商戶登記。");
        setIsSubmitting(false);
        return;
      }

      if (merchant.status !== "approved") {
        setErrorMessage("你的商戶帳戶仍未審批通過，暫時未能建立活動。");
        setIsSubmitting(false);
        return;
      }

      const merchantName =
        merchant.business_name ||
        merchant.contact_email ||
        "HK Family Fun Merchant";

      setStatusMessage("正在嘗試 AI 自動抽取資料...");

      let aiExtracted: AiExtractedEvent | null = null;

      if (mode === "file" && sourceFile?.type.startsWith("image/")) {
        aiExtracted = await tryAiExtractFromImage(sourceFile);
      }

      const fallbackInfo = getFallbackDraftInfo({
        mode,
        sourceUrl: trimmedUrl,
        file: sourceFile,
        merchantName,
      });

      const draftInfo = {
        ...fallbackInfo,
        ...(aiExtracted || {}),
      };

      const sourceType = getSourceType(sourceFile, mode);
      const aiWorked = Boolean(aiExtracted);

      setStatusMessage(
        aiWorked
          ? "AI 已抽取資料，正在建立活動草稿..."
          : "AI 暫未啟用或未成功，正在建立可手動修改的活動草稿..."
      );

      const { data: eventData, error: insertError } = await supabase
        .from("events")
        .insert({
          merchant_id: merchant.id,

          title_tc: draftInfo.title_tc || fallbackInfo.title_tc,
          short_description_tc:
            draftInfo.short_description_tc ||
            fallbackInfo.short_description_tc,
          description_tc:
            draftInfo.description_tc || fallbackInfo.description_tc,

          organizer_name: draftInfo.organizer_name || merchantName,
          venue_name: draftInfo.venue_name || "待商戶確認",
          address: draftInfo.address || "待商戶確認",
          district: draftInfo.district || "待確認",
          mtr_station: draftInfo.mtr_station || "待確認",

          start_date: draftInfo.start_date || null,
          end_date: draftInfo.end_date || null,
          start_time: draftInfo.start_time || null,
          end_time: draftInfo.end_time || null,

          price_type: draftInfo.price_type || "unknown",
          price_min: draftInfo.price_min ?? 0,
          price_max: draftInfo.price_max ?? 0,

          category: draftInfo.category || "親子活動",
          tags: draftInfo.tags || ["商戶匯入", "待確認"],

          registration_required: draftInfo.registration_required ?? false,
          registration_url: draftInfo.registration_url || trimmedUrl || null,

          is_free: draftInfo.price_type === "free",
          is_sen_friendly: draftInfo.is_sen_friendly ?? false,
          is_indoor: draftInfo.is_indoor ?? false,

          cover_image_url: DEFAULT_COVER_IMAGE,

          source_type: sourceType,
          source_url: mode === "url" ? trimmedUrl : null,
          source_file_url: mode === "file" ? sourceFile?.name || null : null,

          ai_extraction_status: aiWorked ? "completed" : "not_available",
          ai_extracted_json: {
            provider: aiWorked ? "openai" : "fallback_no_ai",
            source_type: sourceType,
            source_url: mode === "url" ? trimmedUrl : null,
            source_file_name:
              mode === "file" ? sourceFile?.name || null : null,
            confidence_score:
              draftInfo.confidence_score ?? (aiWorked ? 0.7 : 0.1),
            missing_fields: draftInfo.missing_fields || [],
            warning_notes: draftInfo.warning_notes || [],
            extracted: draftInfo,
          },

          status: "draft",
        })
        .select("id")
        .single();

      if (insertError || !eventData) {
        setErrorMessage(insertError?.message || "建立活動草稿失敗。");
        setIsSubmitting(false);
        return;
      }

      setStatusMessage("活動草稿已建立，正在前往 Preview...");
      router.push(`/merchant/events/${eventData.id}/preview`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "建立活動草稿時發生未知錯誤。"
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/merchant/dashboard")}
            className="mb-4 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← 返回商戶 Dashboard
          </button>

          <h1 className="text-3xl font-bold text-slate-950">
            匯入活動資料
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            商戶可以貼上活動網址，或上載活動圖片 / PDF。即使 AI
            暫未啟用，系統都會先建立草稿，讓你手動確認後提交審批。
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-semibold text-amber-900">
                MVP 安全模式已啟用
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                有 AI API 時：系統會嘗試自動抽取活動資料。沒有 AI API
                或 AI 失敗時：系統仍會建立 draft，不會卡住商戶流程。
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("url");
                setErrorMessage("");
                setStatusMessage("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                mode === "url"
                  ? "border-primary-400 bg-primary-50 ring-2 ring-primary-100"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3">
                  <LinkIcon className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">
                    貼上活動連結
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    官網、商場頁面、Google Form、Klook、Eventbrite 等
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("file");
                setErrorMessage("");
                setStatusMessage("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                mode === "file"
                  ? "border-primary-400 bg-primary-50 ring-2 ring-primary-100"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3">
                  <Upload className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">
                    上載圖片 / PDF
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Poster、活動單張、PDF、宣傳圖
                  </p>
                </div>
              </div>
            </button>
          </div>

          {mode === "url" ? (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                活動來源 URL
              </label>

              <textarea
                value={sourceUrl}
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                  setErrorMessage("");
                  setStatusMessage("");
                }}
                placeholder="貼上活動網址，例如：https://www.airside.com.hk/..."
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                現階段 URL 會先建立 draft。日後可再加 web scraping / AI
                自動抽取。
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                活動圖片 / PDF
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:bg-slate-100">
                <Upload className="mb-3 h-8 w-8 text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">
                  點擊選擇檔案
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  支援 PNG、JPG、WEBP、PDF，最多 8MB
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {selectedFileLabel}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                圖片會嘗試 call AI extraction API；如果沒有 API key
                或失敗，仍會建立 draft。PDF 現階段先建立手動確認 draft。
              </p>
            </div>
          )}

          {statusMessage ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" />
              {isSubmitting ? "正在建立草稿..." : "建立活動草稿"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/merchant/dashboard")}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-950">
            目前 MVP 支援狀態
          </h2>

          <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">URL</div>
              <div className="mt-1 text-slate-600">
                可建立 draft，之後可加 AI / crawler。
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Image</div>
              <div className="mt-1 text-slate-600">
                有 AI API 時自動抽取；無 API 時 fallback。
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">PDF</div>
              <div className="mt-1 text-slate-600">
                現階段先建立 draft，下一階段加 OCR。
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
