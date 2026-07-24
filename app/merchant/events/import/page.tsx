"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Globe2,
  ImageIcon,
  Layers,
  LinkIcon,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ImportMode = "url" | "file" | "batch";

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
  "待確認",
  "全港",
  "多區",
  "網上",
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

const PRICE_TYPES = [
  { value: "unknown", label: "收費待確認" },
  { value: "free", label: "免費" },
  { value: "paid", label: "收費" },
  { value: "mixed", label: "免費及收費" },
];

const CATEGORIES = [
  "親子活動",
  "免費活動",
  "親子閱讀",
  "室內活動",
  "戶外探索",
  "藝術手作",
  "STEM",
  "運動體驗",
  "音樂表演",
  "節日市集",
  "展覽",
  "親子工作坊",
];

const URL_PLACEHOLDER =
  "貼上活動網址，例如：官網活動頁、Facebook post、Instagram post、Google Form、Klook、Eventbrite、商場活動頁、售票平台連結";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function getFileExtension(file: File) {
  const nameParts = file.name.split(".");
  const extensionFromName = nameParts.length > 1 ? nameParts.pop() : "";

  if (extensionFromName) return extensionFromName.toLowerCase();

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "text/csv") return "csv";

  return "file";
}

function detectFileSourceType(file: File): "image" | "pdf" | "csv" | "spreadsheet" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "text/csv") return "csv";
  if (
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "spreadsheet";
  }

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".pdf")) return "pdf";
  if (lowerName.endsWith(".csv")) return "csv";
  if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) return "spreadsheet";
  if (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".webp")
  ) {
    return "image";
  }

  return "file";
}

function getSafeUrlTitle(url: string) {
  try {
    const parsedUrl = new URL(url.trim());
    const pathParts = parsedUrl.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    const blockedParts = ["share", "p", "posts", "post", "events", "event", "zh-hk", "en", "hk"];

    const usefulPart = [...pathParts]
      .reverse()
      .find((part) => {
        const lower = part.toLowerCase();

        if (blockedParts.includes(lower)) return false;
        if (/^[a-z0-9]{6,}$/i.test(part) && !part.includes("-")) return false;

        return true;
      });

    if (!usefulPart) {
      return "AI 匯入活動草稿（來自網址）";
    }

    const cleaned = usefulPart
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "AI 匯入活動草稿（來自網址）";

    return cleaned
      .split(" ")
      .map((word) => {
        if (!word) return word;
        if (/[\u4e00-\u9fff]/.test(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  } catch {
    return "AI 匯入活動草稿（來自網址）";
  }
}

function getDraftTitle(mode: ImportMode, sourceUrl: string, file: File | null) {
  if (mode === "url") {
    return getSafeUrlTitle(sourceUrl);
  }

  if (file) {
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    if (mode === "batch") return `批量匯入活動草稿（${baseName}）`;
    return `AI 匯入活動草稿（${baseName}）`;
  }

  if (mode === "batch") return "批量匯入活動草稿";
  return "AI 匯入活動草稿";
}

function getDraftShortDescription(mode: ImportMode) {
  if (mode === "url") {
    return "系統已根據活動連結建立草稿。請在 Preview 檢查資料，再補充日期、地點、收費及報名資料。";
  }

  if (mode === "batch") {
    return "系統已根據 CSV / Excel 建立批量匯入草稿。請稍後逐一檢查活動資料。";
  }

  return "系統已根據上載的活動海報或 PDF 建立草稿。請在 Preview 檢查資料，再補充需要欄位。";
}

function getDraftDescription(mode: ImportMode, sourceUrl: string, file: File | null) {
  if (mode === "url") {
    return [
      "此活動由商戶貼上的活動連結建立草稿。",
      "目前是 MVP AI 匯入流程：系統先建立活動草稿，再由商戶補充及確認資料。",
      sourceUrl ? `來源網址：${sourceUrl}` : "",
      "請補充活動日期、時間、地點、收費、報名連結及封面圖片後，再提交 HK Family Fun 審批。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (mode === "batch") {
    return [
      "此活動由商戶上載的 CSV / Excel 建立批量匯入草稿。",
      file ? `來源檔案：${file.name}` : "",
      "現階段先建立草稿記錄。下一階段會支援一個檔案批量建立多個活動。",
      "請檢查內容後，再逐一提交 HK Family Fun 審批。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "此活動由商戶上載的圖片或 PDF 建立草稿。",
    file ? `來源檔案：${file.name}` : "",
    "目前是 MVP AI 匯入流程：系統先建立活動草稿，再由商戶補充及確認資料。",
    "請補充活動日期、時間、地點、收費、報名連結及封面圖片後，再提交 HK Family Fun 審批。",
  ]
    .filter(Boolean)
    .join("\n");
}

function getSourceType(mode: ImportMode, file: File | null) {
  if (mode === "url") return "url";
  if (mode === "batch" && file) return detectFileSourceType(file);
  if (file) return detectFileSourceType(file);

  return mode;
}

function getDefaultTags(category: string, mode: ImportMode) {
  const tags = new Set<string>();

  tags.add(category || "親子活動");

  if (mode === "url") tags.add("URL匯入");
  if (mode === "file") tags.add("AI匯入");
  if (mode === "batch") tags.add("批量匯入");

  tags.add("待確認");

  return Array.from(tags);
}

function isMerchantApproved(status: string | null) {
  return status === "approved";
}

export default function MerchantEventImportPage() {
  const router = useRouter();

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [mode, setMode] = useState<ImportMode>("url");

  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  const [defaultDistrict, setDefaultDistrict] = useState("待確認");
  const [defaultPriceType, setDefaultPriceType] = useState("unknown");
  const [defaultCategory, setDefaultCategory] = useState("親子活動");
  const [defaultMtrStation, setDefaultMtrStation] = useState("");
  const [needRegistration, setNeedRegistration] = useState(false);

  const [isIndoor, setIsIndoor] = useState(false);
  const [isSenFriendly, setIsSenFriendly] = useState(false);

  const [isLoadingMerchant, setIsLoadingMerchant] = useState(true);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedFileType = useMemo(() => {
    if (!sourceFile) return "";
    return detectFileSourceType(sourceFile);
  }, [sourceFile]);

  async function loadMerchant() {
    setIsLoadingMerchant(true);
    setErrorMessage("");

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。");
        setIsLoadingMerchant(false);
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

      const { data, error } = await supabase
        .from("merchants")
        .select("id, business_name, contact_name, contact_email, status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoadingMerchant(false);
        return;
      }

      if (!data) {
        router.replace("/merchant/register");
        return;
      }

      setMerchant(data as MerchantProfile);
      setIsLoadingMerchant(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "載入商戶資料時發生未知錯誤。"
      );
      setIsLoadingMerchant(false);
    }
  }

  useEffect(() => {
    loadMerchant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(nextMode: ImportMode) {
    setMode(nextMode);
    setErrorMessage("");
    setSuccessMessage("");

    if (nextMode === "url") {
      setSourceFile(null);
    } else {
      setSourceUrl("");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage("");
    setSuccessMessage("");

    const file = event.target.files?.[0];

    if (!file) {
      setSourceFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSourceFile(null);
      setErrorMessage(`檔案不可大於 ${MAX_FILE_SIZE_MB}MB。`);
      event.target.value = "";
      return;
    }

    const fileType = detectFileSourceType(file);

    if (!ACCEPTED_FILE_TYPES.includes(file.type) && fileType === "file") {
      setSourceFile(null);
      setErrorMessage("只支援 JPG、PNG、WebP、PDF、CSV、Excel 檔案。");
      event.target.value = "";
      return;
    }

    if (mode === "file" && fileType !== "image" && fileType !== "pdf") {
      setSourceFile(null);
      setErrorMessage("海報 / PDF 模式只支援圖片或 PDF。CSV / Excel 請使用批量匯入。");
      event.target.value = "";
      return;
    }

    if (mode === "batch" && fileType !== "csv" && fileType !== "spreadsheet") {
      setSourceFile(null);
      setErrorMessage("批量匯入只支援 CSV 或 Excel。圖片 / PDF 請使用海報 / PDF 模式。");
      event.target.value = "";
      return;
    }

    setSourceFile(file);
  }

  async function uploadSourceFile(file: File, merchantId: string) {
    if (!supabase) {
      throw new Error("Supabase client 未能初始化。");
    }

    const extension = getFileExtension(file);
    const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `${merchantId}/imports/${safeFileName}`;

    const { error } = await supabase.storage.from("event-images").upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from("event-images").getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: data.publicUrl,
    };
  }

  function validateImport() {
    if (!merchant) return "商戶資料未載入。";

    if (!isMerchantApproved(merchant.status)) {
      return "商戶帳戶仍未通過審批，暫時不能提交新活動。";
    }

    if (mode === "url") {
      const trimmedUrl = sourceUrl.trim();

      if (!trimmedUrl) return "請先貼上活動 URL。";

      try {
        new URL(trimmedUrl);
      } catch {
        return "活動 URL 格式不正確。請貼上完整網址，例如 https://example.com/event";
      }
    }

    if (mode === "file" && !sourceFile) {
      return "請先上載活動海報圖片或 PDF。";
    }

    if (mode === "batch" && !sourceFile) {
      return "請先上載 CSV 或 Excel 檔案。";
    }

    return "";
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateImport();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!merchant) return;

    try {
      if (!supabase) {
        setErrorMessage("Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。");
        return;
      }

      setIsCreatingDraft(true);

      let uploadedFileUrl: string | null = null;
      let uploadedFilePath: string | null = null;

      if ((mode === "file" || mode === "batch") && sourceFile) {
        const uploaded = await uploadSourceFile(sourceFile, merchant.id);
        uploadedFileUrl = uploaded.publicUrl;
        uploadedFilePath = uploaded.storagePath;
      }

      const sourceType = getSourceType(mode, sourceFile);
      const coverImageUrl =
        sourceType === "image" && uploadedFileUrl ? uploadedFileUrl : DEFAULT_COVER_IMAGE;

      const now = new Date().toISOString();

      const draftTitle = getDraftTitle(mode, sourceUrl, sourceFile);
      const draftShortDescription = getDraftShortDescription(mode);
      const draftDescription = getDraftDescription(mode, sourceUrl, sourceFile);

      const { data, error } = await supabase
        .from("events")
        .insert({
          merchant_id: merchant.id,
          title_tc: draftTitle,
          short_description_tc: draftShortDescription,
          description_tc: draftDescription,
          organizer_name: merchant.business_name || "待確認",
          venue_name: "待確認",
          address: "待確認",
          district: defaultDistrict,
          mtr_station: defaultMtrStation.trim() || "待確認",
          category: defaultCategory,
          tags: getDefaultTags(defaultCategory, mode),
          price_type: defaultPriceType,
          price_min: null,
          price_max: null,
          registration_required: needRegistration,
          registration_url: mode === "url" ? sourceUrl.trim() : null,
          is_free: defaultPriceType === "free",
          is_sen_friendly: isSenFriendly,
          is_indoor: isIndoor,
          cover_image_url: coverImageUrl,
          cover_image_position: "custom",
          cover_image_focus_x: 50,
          cover_image_focus_y: 50,
          source_type: sourceType,
          source_url: mode === "url" ? sourceUrl.trim() : null,
          source_file_url: uploadedFileUrl,
          ai_extraction_status: "draft_created",
          ai_extracted_json: {
            import_mode: mode,
            source_type: sourceType,
            source_url: mode === "url" ? sourceUrl.trim() : null,
            source_file_name: sourceFile?.name || null,
            source_file_url: uploadedFileUrl,
            source_file_path: uploadedFilePath,
            default_district: defaultDistrict,
            default_price_type: defaultPriceType,
            default_category: defaultCategory,
            mvp_note:
              "MVP AI intake: draft created from source. Merchant should review and complete details before submission.",
            created_by: "merchant_import_page",
          },
          status: "draft",
          admin_review_note: null,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (error) {
        setErrorMessage(error.message);
        setIsCreatingDraft(false);
        return;
      }

      if (!data?.id) {
        setErrorMessage("活動草稿已建立，但未能取得活動 ID。");
        setIsCreatingDraft(false);
        return;
      }

      setSuccessMessage("活動草稿已建立，正在前往 Preview。");

      router.push(`/merchant/events/${data.id}/preview`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "建立活動草稿時發生未知錯誤。"
      );
      setIsCreatingDraft(false);
    }
  }

  if (isLoadingMerchant) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入商戶匯入頁...</p>
        </div>
      </main>
    );
  }

  const merchantApproved = isMerchantApproved(merchant?.status || null);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          type="button"
          onClick={() => router.push("/merchant/dashboard")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 Merchant Dashboard
        </button>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative p-7 md:p-9">
              <div className="absolute left-0 top-0 h-44 w-44 rounded-full bg-primary-100 blur-3xl" />
              <div className="absolute bottom-0 right-20 h-36 w-36 rounded-full bg-secondary-100 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-bold text-primary-600">
                  <Sparkles className="h-4 w-4" />
                  HK Family Fun AI Event Intake
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950">
                  不用重複輸入活動資料
                  <br />
                  貼 link 或上載海報即可建立草稿
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                  商戶只需要提供原本已發布的活動資料來源，例如官網、Facebook、Instagram、
                  Google Form、活動海報或 PDF。系統會先建立活動草稿，再由你 Preview、
                  補充資料及提交 HK Family Fun 審批。
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <HeroPoint icon={<LinkIcon className="h-5 w-5" />} title="貼活動 URL" note="最快建立草稿" />
                  <HeroPoint icon={<ImageIcon className="h-5 w-5" />} title="上載海報 / PDF" note="適合宣傳圖" />
                  <HeroPoint icon={<FileSpreadsheet className="h-5 w-5" />} title="批量 CSV / Excel" note="適合大型商戶" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-950 p-7 text-white lg:border-l lg:border-t-0 md:p-9">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-primary-200">
                    <Wand2 className="h-7 w-7" />
                  </div>

                  <h2 className="mt-5 text-2xl font-black">
                    Shopify-like 自主活動管理
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    建立草稿、修改資料、封面 crop、Preview、提交審批、複製活動及封存活動，
                    商戶可自行維護活動內容，減少來回 email。
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <ProcessStep number="1" text="匯入活動來源" />
                  <ProcessStep number="2" text="系統建立活動草稿" />
                  <ProcessStep number="3" text="商戶 Preview 及補資料" />
                  <ProcessStep number="4" text="提交 HK Family Fun 審批" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {!merchantApproved ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <div className="font-bold">商戶帳戶仍在審批中</div>
            <p className="mt-1 leading-6">
              你可以先準備資料，但暫時不能建立新活動草稿。帳戶通過後即可使用 AI 匯入功能。
            </p>
          </section>
        ) : null}

        {errorMessage ? (
          <section className="flex gap-2 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </section>
        ) : null}

        {successMessage ? (
          <section className="flex gap-2 rounded-3xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </section>
        ) : null}

        <form onSubmit={createDraft} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  選擇匯入方式
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  建議先用 URL 或海報匯入。批量匯入適合商場、教育中心、NGO 或大型活動主辦方。
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <ModeCard
                active={mode === "url"}
                icon={<Globe2 className="h-5 w-5" />}
                title="活動 URL"
                note="官網 / Facebook / Instagram / Google Form / Klook"
                onClick={() => switchMode("url")}
              />

              <ModeCard
                active={mode === "file"}
                icon={<FileText className="h-5 w-5" />}
                title="海報 / PDF"
                note="上載活動圖片或 PDF，先建立草稿"
                onClick={() => switchMode("file")}
              />

              <ModeCard
                active={mode === "batch"}
                icon={<Layers className="h-5 w-5" />}
                title="CSV / Excel"
                note="批量匯入，多活動商戶適用"
                onClick={() => switchMode("batch")}
              />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              {mode === "url" ? (
                <label className="block">
                  <span className="text-sm font-bold text-slate-800">
                    活動來源 URL
                  </span>

                  <textarea
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder={URL_PLACEHOLDER}
                    rows={5}
                    className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    提示：請貼上公開可瀏覽的活動頁。Facebook private group 或需要登入的頁面，AI 未必能完整讀取。
                  </p>
                </label>
              ) : (
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {mode === "file" ? "上載活動海報 / PDF" : "上載 CSV / Excel"}
                  </div>

                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-primary-300 hover:bg-primary-50/40">
                    <Upload className="h-8 w-8 text-primary-500" />

                    <div className="mt-3 text-sm font-bold text-slate-950">
                      {sourceFile ? sourceFile.name : "按此選擇檔案"}
                    </div>

                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {mode === "file"
                        ? "支援 JPG、PNG、WebP、PDF。"
                        : "支援 CSV、XLS、XLSX。"}
                      最大 {MAX_FILE_SIZE_MB}MB。
                    </div>

                    <input
                      type="file"
                      accept={
                        mode === "file"
                          ? "image/jpeg,image/png,image/webp,application/pdf"
                          : ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      }
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {sourceFile ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <div className="font-bold">已選擇檔案</div>
                      <div className="mt-1 break-all">{sourceFile.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        類型：{selectedFileType || "file"}・大小：
                        {(sourceFile.size / 1024 / 1024).toFixed(2)}MB
                      </div>
                    </div>
                  ) : null}

                  {mode === "batch" ? (
                    <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-700">
                      MVP 階段會先建立「批量匯入草稿」。下一階段會把 CSV / Excel 每一行自動轉成獨立活動。
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-800">預設地區</span>
                <select
                  value={defaultDistrict}
                  onChange={(event) => setDefaultDistrict(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-800">活動分類</span>
                <select
                  value={defaultCategory}
                  onChange={(event) => setDefaultCategory(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-800">收費類型</span>
                <select
                  value={defaultPriceType}
                  onChange={(event) => setDefaultPriceType(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {PRICE_TYPES.map((priceType) => (
                    <option key={priceType.value} value={priceType.value}>
                      {priceType.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-800">港鐵站，可留空</span>
                <input
                  value={defaultMtrStation}
                  onChange={(event) => setDefaultMtrStation(event.target.value)}
                  placeholder="例如：九龍灣、金鐘、沙田"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <ToggleBox
                checked={needRegistration}
                onChange={setNeedRegistration}
                label="需要預先報名"
                note="例如 Google Form / Klook / Eventbrite"
              />

              <ToggleBox
                checked={isIndoor}
                onChange={setIsIndoor}
                label="室內活動"
                note="方便家長篩選雨天 / 夏天活動"
              />

              <ToggleBox
                checked={isSenFriendly}
                onChange={setIsSenFriendly}
                label="SEN 友善"
                note="如活動資料有清楚提及才勾選"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isCreatingDraft || !merchantApproved}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Wand2 className="h-5 w-5" />
                {isCreatingDraft ? "正在建立活動草稿..." : "建立 AI 活動草稿"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/merchant/dashboard")}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                返回 Dashboard
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Sparkles className="h-5 w-5 text-primary-500" />
                為何商戶會用？
              </h2>

              <div className="mt-5 space-y-3">
                <ValuePoint title="少做重複輸入" note="不用同一活動在不同平台重打一遍。" />
                <ValuePoint title="更快上架" note="先建立草稿，再補資料及提交審批。" />
                <ValuePoint title="自己維護內容" note="像 Shopify 一樣自己管理活動資料。" />
                <ValuePoint title="有助曝光" note="活動審批後可在 HK Family Fun 搜尋頁展示。" />
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">資料品質提醒</h2>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  AI 草稿不是最終發布內容。提交前請確認日期、時間、地點、收費及報名連結。
                </p>
                <p>
                  如活動資料不完整，HK Family Fun 可能會退回要求補充。
                </p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-primary-200 bg-primary-50 p-6">
              <h2 className="text-lg font-black text-primary-700">
                將來可升級收費功能
              </h2>

              <div className="mt-4 space-y-3 text-sm leading-6 text-primary-800">
                <p>• 批量匯入多個活動</p>
                <p>• Google Sheet 每晚同步</p>
                <p>• 商戶專頁及 featured placement</p>
                <p>• 活動曝光及點擊數據</p>
                <p>• 大型合作夥伴 API / webhook</p>
              </div>
            </section>
          </aside>
        </form>
      </div>
    </main>
  );
}

function HeroPoint({
  icon,
  title,
  note,
}: {
  icon: ReactNode;
  title: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        {icon}
      </div>
      <div className="mt-3 text-sm font-black text-slate-950">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
    </div>
  );
}

function ProcessStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-400 text-sm font-black text-white">
        {number}
      </div>
      <div className="text-sm font-bold text-white">{text}</div>
    </div>
  );
}

function ModeCard({
  active,
  icon,
  title,
  note,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left transition ${
        active
          ? "border-primary-400 bg-primary-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          active ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {icon}
      </div>

      <div className="mt-4 text-base font-black text-slate-950">{title}</div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{note}</div>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary-600">
        {active ? "已選擇" : "選擇"}
        <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function ToggleBox({
  checked,
  onChange,
  label,
  note,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  note: string;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-3xl border p-4 ${
        checked
          ? "border-primary-300 bg-primary-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600"
        />

        <div>
          <div className="text-sm font-black text-slate-950">{label}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
        </div>
      </div>
    </label>
  );
}

function ValuePoint({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-black text-slate-950">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
    </div>
  );
}