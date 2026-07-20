"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  LinkIcon,
  Upload,
  Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ImportMode = "url" | "file";

type MerchantProfile = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;
};

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

const DISTRICTS = [
  "全港",
  "多區",
  "網上",
  "待確認",
  "中西區",
  "灣仔",
  "東區",
  "南區",
  "油尖旺",
  "深水埗",
  "九龍城",
  "黃大仙",
  "觀塘",
  "荃灣",
  "屯門",
  "元朗",
  "北區",
  "大埔",
  "沙田",
  "西貢",
  "葵青",
  "離島",
];

function makeTitleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const lastPath = parsed.pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, " ")
      .replace(/_/g, " ");

    if (lastPath && lastPath.length > 3) {
      return lastPath
        .split(" ")
        .map((word) =>
          word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
        )
        .join(" ");
    }

    return parsed.hostname.replace("www.", "");
  } catch {
    return "AI 匯入活動草稿";
  }
}

function guessDistrictFromSource(sourceText: string) {
  const text = sourceText.toLowerCase();

  if (
    text.includes("hkpl") ||
    text.includes("library") ||
    text.includes("festival") ||
    text.includes("various") ||
    text.includes("多區") ||
    text.includes("全港")
  ) {
    return "全港";
  }

  if (
    text.includes("online") ||
    text.includes("zoom") ||
    text.includes("webinar") ||
    text.includes("網上")
  ) {
    return "網上";
  }

  const directDistrict = DISTRICTS.find((district) => sourceText.includes(district));
  return directDistrict || "待確認";
}

function guessVenueFromSource(sourceText: string) {
  const text = sourceText.toLowerCase();

  if (text.includes("hkpl") || text.includes("library")) {
    return "香港公共圖書館各分館及網上活動";
  }

  if (text.includes("hktdc") || text.includes("book fair")) {
    return "Hong Kong Convention and Exhibition Centre";
  }

  if (text.includes("airside")) {
    return "AIRSIDE";
  }

  return "待確認";
}

function guessMtrFromDistrict(district: string) {
  if (district === "全港") return "多個港鐵站／視乎場地而定";
  if (district === "多區") return "多個港鐵站／視乎場地而定";
  if (district === "網上") return "不適用";
  return "待確認";
}

function guessCategoryFromSource(sourceText: string) {
  const text = sourceText.toLowerCase();

  if (text.includes("library") || text.includes("book") || text.includes("reading")) {
    return "親子閱讀";
  }

  if (text.includes("workshop")) {
    return "親子工作坊";
  }

  if (text.includes("exhibition") || text.includes("festival")) {
    return "親子活動";
  }

  return "親子活動";
}

function guessTagsFromSource(sourceText: string) {
  const text = sourceText.toLowerCase();
  const tags = ["親子活動"];

  if (text.includes("free") || text.includes("免費")) tags.push("免費活動");
  if (text.includes("library") || text.includes("reading")) {
    tags.push("閱讀", "圖書館");
  }
  if (text.includes("workshop")) tags.push("工作坊");
  if (text.includes("summer")) tags.push("暑假活動");
  if (text.includes("festival")) tags.push("節日活動");

  return Array.from(new Set(tags));
}

function makeMockExtractedEvent(sourceText: string, mode: ImportMode) {
  const title =
    sourceText.toLowerCase().includes("summer-library-festival") ||
    sourceText.toLowerCase().includes("hkpl")
      ? "Summer Library Festival 2026 夏日圖書館節"
      : makeTitleFromUrl(sourceText);

  const district = guessDistrictFromSource(sourceText);
  const venueName = guessVenueFromSource(sourceText);
  const category = guessCategoryFromSource(sourceText);
  const tags = guessTagsFromSource(sourceText);

  return {
    title,
    shortDescription:
      title.includes("Summer Library Festival")
        ? "香港公共圖書館夏季閱讀活動，設有講座、工作坊、網上影片、手工及外展活動。"
        : "系統已根據來源資料建立活動草稿，請商戶在 Preview 頁面檢查資料，確認後提交平台審批。",
    description:
      title.includes("Summer Library Festival")
        ? "香港公共圖書館 2026 年夏季舉辦 Summer Library Festival 2026，主題為 Happiness Trains - Discovering Treasures of the Soul。活動包括講座、工作坊、影片、手工及外展活動。實際場次及名額以官方公布為準。"
        : "這是 AI 自動匯入流程建立的活動草稿。正式發布前，請商戶確認活動日期、時間、地點、地區、港鐵站、收費、年齡、主辦單位、報名連結及活動圖片。MVP 階段先驗證商戶一鍵匯入、預覽及提交審批流程。",
    organizerName: title.includes("Summer Library Festival")
      ? "Hong Kong Public Libraries"
      : "Test Family Fun Centre",
    venueName,
    address:
      district === "全港" || district === "多區"
        ? "多個指定場地；請以官方活動頁公布為準"
        : district === "網上"
          ? "網上活動"
          : "待確認",
    district,
    mtrStation: guessMtrFromDistrict(district),
    category,
    tags,
    priceType:
      sourceText.toLowerCase().includes("free") ||
      sourceText.includes("免費") ||
      title.includes("Summer Library Festival")
        ? "free"
        : "unknown",
    priceMin:
      sourceText.toLowerCase().includes("free") ||
      sourceText.includes("免費") ||
      title.includes("Summer Library Festival")
        ? 0
        : null,
    priceMax:
      sourceText.toLowerCase().includes("free") ||
      sourceText.includes("免費") ||
      title.includes("Summer Library Festival")
        ? 0
        : null,
    startDate: title.includes("Summer Library Festival") ? "2026-07-15" : null,
    endDate: title.includes("Summer Library Festival") ? "2026-08-31" : null,
    startTime: null,
    endTime: null,
    registrationRequired: mode === "url",
    registrationUrl: mode === "url" ? sourceText : null,
  };
}

export default function MerchantEventImportPage() {
  const router = useRouter();

  const [mode, setMode] = useState<ImportMode>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState("待確認");
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSourceFile(file);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsImporting(true);

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsImporting(false);
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

      const { data: merchantData, error: merchantError } = await supabase
        .from("merchants")
        .select("id, business_name, contact_name, contact_email, status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError) {
        setErrorMessage(merchantError.message);
        setIsImporting(false);
        return;
      }

      if (!merchantData) {
        router.replace("/merchant/register");
        return;
      }

      const merchant = merchantData as MerchantProfile;

      if (merchant.status !== "approved") {
        setErrorMessage("商戶帳戶仍未通過審批，暫時未能匯入活動。");
        setIsImporting(false);
        return;
      }

      const trimmedUrl = sourceUrl.trim();

      if (mode === "url" && !trimmedUrl) {
        setErrorMessage("請貼上活動來源 URL。");
        setIsImporting(false);
        return;
      }

      if (mode === "file" && !sourceFile) {
        setErrorMessage("請上載活動圖片或 PDF。");
        setIsImporting(false);
        return;
      }

      const sourceText =
        mode === "url" ? trimmedUrl : sourceFile?.name || "活動圖片或 PDF";
      const sourceType = mode === "url" ? "url" : "image";
      const extracted = makeMockExtractedEvent(sourceText, mode);

      const finalDistrict =
        selectedDistrict !== "待確認" ? selectedDistrict : extracted.district;

      const { data: insertedEvent, error: insertError } = await supabase
        .from("events")
        .insert({
          merchant_id: merchant.id,
          title_tc: extracted.title,
          short_description_tc: extracted.shortDescription,
          description_tc: extracted.description,
          organizer_name: extracted.organizerName || merchant.business_name,
          venue_name: extracted.venueName,
          address: extracted.address,
          district: finalDistrict,
          mtr_station: extracted.mtrStation,
          start_date: extracted.startDate,
          end_date: extracted.endDate,
          start_time: extracted.startTime,
          end_time: extracted.endTime,
          category: extracted.category,
          tags: extracted.tags,
          price_type: extracted.priceType,
          price_min: extracted.priceMin,
          price_max: extracted.priceMax,
          is_free: extracted.priceType === "free",
          is_sen_friendly: false,
          is_indoor: false,
          registration_required: extracted.registrationRequired,
          registration_url: extracted.registrationUrl,
          cover_image_url: DEFAULT_COVER_IMAGE,
          source_type: sourceType,
          source_url: mode === "url" ? trimmedUrl : null,
          source_file_url: mode === "file" ? sourceFile?.name || null : null,
          ai_extraction_status: "completed",
          ai_extracted_json: {
            note: "MVP mock AI extraction. Real OCR / AI extraction will be connected later.",
            source: sourceText,
            district_options_enabled: true,
            district: finalDistrict,
          },
          status: "draft",
        })
        .select("id")
        .single();

      if (insertError) {
        setErrorMessage(insertError.message);
        setIsImporting(false);
        return;
      }

      setSuccessMessage("活動草稿已建立，正在前往 Preview 頁面。");

      setTimeout(() => {
        router.push(`/merchant/events/${insertedEvent.id}/preview`);
      }, 500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "匯入活動時發生未知錯誤。"
      );
      setIsImporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/merchant/dashboard")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 Merchant Dashboard
        </button>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-primary-600">
            HK Family Fun Merchant Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            匯入活動資料
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            商戶只需要貼上官方活動 URL，或上載活動圖片 / PDF。系統會先建立活動草稿，再讓你在 Preview 頁面確認資料。
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleImport}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2"
          >
            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("url")}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  mode === "url"
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                貼上活動 URL
              </button>

              <button
                type="button"
                onClick={() => setMode("file")}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  mode === "file"
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Upload className="h-4 w-4" />
                上載圖片 / PDF
              </button>
            </div>

            {mode === "url" ? (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  活動來源 URL
                </span>

                <textarea
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="貼上活動網址，例如：官網、Facebook post、Instagram post、Google Form、Klook、Eventbrite、售票平台連結"
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  上載活動圖片或 PDF
                </span>

                <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-600"
                  />

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    MVP 階段會先以檔名建立草稿；之後會接駁 OCR / Gemini 自動讀取圖片及 PDF 內容。
                  </p>

                  {sourceFile ? (
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      已選擇：{sourceFile.name}
                    </p>
                  ) : null}
                </div>
              </label>
            )}

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-700">
                預設地區
              </span>

              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                大型活動可選「全港」或「多區」；純網上活動可選「網上」。如不確定，可先保留「待確認」，之後在修改頁補資料。
              </p>
            </label>

            {errorMessage ? (
              <div className="mt-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isImporting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Wand2 className="h-4 w-4" />
              {isImporting ? "正在建立活動草稿..." : "建立活動草稿"}
            </button>
          </form>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-slate-950">
                <FileText className="h-5 w-5 text-primary-500" />
                匯入流程
              </h2>

              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li className="rounded-2xl bg-slate-50 p-3">
                  1. 貼上活動 URL 或上載圖片 / PDF
                </li>
                <li className="rounded-2xl bg-slate-50 p-3">
                  2. 系統建立活動草稿
                </li>
                <li className="rounded-2xl bg-slate-50 p-3">
                  3. 商戶在 Preview 檢查資料
                </li>
                <li className="rounded-2xl bg-slate-50 p-3">
                  4. 補充地區、時間、收費及報名資料
                </li>
                <li className="rounded-2xl bg-slate-50 p-3">
                  5. 提交 HK Family Fun 審批
                </li>
              </ol>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-amber-900">資料提醒</h2>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                匯入只是建立草稿，不會即時公開。大型活動請優先使用「全港」或「多區」，不要強行填單一地區。
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}