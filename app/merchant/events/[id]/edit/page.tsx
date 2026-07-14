"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Save,
  Eye,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type EditableEvent = {
  id: string;
  merchant_id: string | null;
  title_tc: string | null;
  short_description_tc: string | null;
  description_tc: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  mtr_station: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  category: string | null;
  registration_required: boolean | null;
  registration_url: string | null;
  is_sen_friendly: boolean | null;
  is_indoor: boolean | null;
  status: string | null;
};

const DISTRICTS = [
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
  "葵青",
  "荃灣",
  "屯門",
  "元朗",
  "北區",
  "大埔",
  "沙田",
  "西貢",
  "離島",
];

const CATEGORIES = [
  "親子活動",
  "室內活動",
  "戶外活動",
  "展覽",
  "工作坊",
  "運動",
  "STEM",
  "藝術",
  "音樂",
  "免費活動",
  "商場活動",
  "其他",
];

const PRICE_TYPES = [
  { value: "unknown", label: "待確認" },
  { value: "free", label: "免費" },
  { value: "paid", label: "收費" },
  { value: "mixed", label: "免費 + 收費" },
];

function toInputDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toInputTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

export default function MerchantEventEditPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = String(params.id || "");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [eventData, setEventData] = useState<EditableEvent | null>(null);

  async function loadEvent() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsLoading(false);
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
        .select("id, owner_user_id, status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError || !merchant) {
        router.replace("/merchant/register");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          [
            "id",
            "merchant_id",
            "title_tc",
            "short_description_tc",
            "description_tc",
            "organizer_name",
            "venue_name",
            "address",
            "district",
            "mtr_station",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "price_type",
            "price_min",
            "price_max",
            "category",
            "registration_required",
            "registration_url",
            "is_sen_friendly",
            "is_indoor",
            "status",
          ].join(", ")
        )
        .eq("id", eventId)
        .eq("merchant_id", merchant.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("找不到此活動，或你沒有權限修改。");
        setIsLoading(false);
        return;
      }

      setEventData(data as unknown as EditableEvent);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "載入活動資料時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function updateField<K extends keyof EditableEvent>(
    field: K,
    value: EditableEvent[K]
  ) {
    setEventData((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!eventData) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsSaving(false);
        return;
      }

      if (!eventData.title_tc?.trim()) {
        setErrorMessage("請填寫活動名稱。");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({
          title_tc: eventData.title_tc?.trim() || null,
          short_description_tc:
            eventData.short_description_tc?.trim() || null,
          description_tc: eventData.description_tc?.trim() || null,

          organizer_name: eventData.organizer_name?.trim() || null,
          venue_name: eventData.venue_name?.trim() || null,
          address: eventData.address?.trim() || null,
          district: eventData.district || "待確認",
          mtr_station: eventData.mtr_station?.trim() || "待確認",

          start_date: eventData.start_date || null,
          end_date: eventData.end_date || null,
          start_time: eventData.start_time || null,
          end_time: eventData.end_time || null,

          price_type: eventData.price_type || "unknown",
          price_min: Number(eventData.price_min || 0),
          price_max: Number(eventData.price_max || 0),

          category: eventData.category || "親子活動",

          registration_required: Boolean(eventData.registration_required),
          registration_url: eventData.registration_url?.trim() || null,

          is_sen_friendly: Boolean(eventData.is_sen_friendly),
          is_indoor: Boolean(eventData.is_indoor),

          updated_at: new Date().toISOString(),
        })
        .eq("id", eventData.id);

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }

      setSuccessMessage("活動資料已儲存。");
      setIsSaving(false);

      setTimeout(() => {
        router.push(`/merchant/events/${eventData.id}/preview`);
      }, 600);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "儲存活動資料時發生未知錯誤。"
      );
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入活動資料...</p>
        </div>
      </main>
    );
  }

  if (!eventData) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <p className="text-sm text-red-700">
            {errorMessage || "找不到活動資料。"}
          </p>
        </div>
      </main>
    );
  }

  const isSubmitted = eventData.status === "submitted";
  const isPublished =
    eventData.status === "published" || eventData.status === "approved";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.push(`/merchant/events/${eventData.id}/preview`)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 Preview
        </button>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-primary-600">
            HK Family Fun Merchant Portal
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            修改活動資料
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            請補充及確認活動名稱、日期、時間、地點、收費及報名資料。儲存後會返回 Preview 頁面。
          </p>
        </section>

        {isSubmitted ? (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            此活動已提交審批。如需修改，之後應加入「撤回修改」或由管理員退回功能。
          </div>
        ) : null}

        {isPublished ? (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            此活動已發布。正式版本應限制商戶直接修改已發布活動，避免公開資料突然改變。
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-6 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        ) : null}

        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                活動名稱 *
              </label>
              <input
                value={eventData.title_tc || ""}
                onChange={(e) => updateField("title_tc", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="例如：暑假親子放電活動"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                活動簡介
              </label>
              <textarea
                value={eventData.short_description_tc || ""}
                onChange={(e) =>
                  updateField("short_description_tc", e.target.value)
                }
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="簡短描述活動重點，會顯示在活動卡。"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                活動詳情
              </label>
              <textarea
                value={eventData.description_tc || ""}
                onChange={(e) => updateField("description_tc", e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="詳細介紹活動內容、家長注意事項、報名方法等。"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  主辦單位
                </label>
                <input
                  value={eventData.organizer_name || ""}
                  onChange={(e) =>
                    updateField("organizer_name", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="例如：奧海城"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  場地名稱
                </label>
                <input
                  value={eventData.venue_name || ""}
                  onChange={(e) => updateField("venue_name", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="例如：奧海城二期"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                地址
              </label>
              <input
                value={eventData.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                placeholder="完整地址"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  地區
                </label>
                <select
                  value={eventData.district || "待確認"}
                  onChange={(e) => updateField("district", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  港鐵站
                </label>
                <input
                  value={eventData.mtr_station || ""}
                  onChange={(e) => updateField("mtr_station", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="例如：奧運站"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  開始日期
                </label>
                <input
                  type="date"
                  value={toInputDate(eventData.start_date)}
                  onChange={(e) => updateField("start_date", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  結束日期
                </label>
                <input
                  type="date"
                  value={toInputDate(eventData.end_date)}
                  onChange={(e) => updateField("end_date", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  開始時間
                </label>
                <input
                  type="time"
                  value={toInputTime(eventData.start_time)}
                  onChange={(e) => updateField("start_time", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  結束時間
                </label>
                <input
                  type="time"
                  value={toInputTime(eventData.end_time)}
                  onChange={(e) => updateField("end_time", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  收費類型
                </label>
                <select
                  value={eventData.price_type || "unknown"}
                  onChange={(e) => updateField("price_type", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {PRICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  最低收費 HK$
                </label>
                <input
                  type="number"
                  min="0"
                  value={eventData.price_min ?? 0}
                  onChange={(e) =>
                    updateField("price_min", Number(e.target.value || 0))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  最高收費 HK$
                </label>
                <input
                  type="number"
                  min="0"
                  value={eventData.price_max ?? 0}
                  onChange={(e) =>
                    updateField("price_max", Number(e.target.value || 0))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  活動分類
                </label>
                <select
                  value={eventData.category || "親子活動"}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  報名連結
                </label>
                <input
                  value={eventData.registration_url || ""}
                  onChange={(e) =>
                    updateField("registration_url", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(eventData.registration_required)}
                  onChange={(e) =>
                    updateField("registration_required", e.target.checked)
                  }
                />
                需要預先報名
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(eventData.is_indoor)}
                  onChange={(e) =>
                    updateField("is_indoor", e.target.checked)
                  }
                />
                室內活動
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(eventData.is_sen_friendly)}
                  onChange={(e) =>
                    updateField("is_sen_friendly", e.target.checked)
                  }
                />
                SEN 友善
              </label>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "正在儲存..." : "儲存草稿"}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(`/merchant/events/${eventData.id}/preview`)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                返回 Preview
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}