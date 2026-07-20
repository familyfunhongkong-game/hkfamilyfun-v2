"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  LinkIcon,
  MapPin,
  Save,
  Ticket,
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
  tags: string[] | null;
  cover_image_url: string | null;
  registration_required: boolean | null;
  registration_url: string | null;
  is_sen_friendly: boolean | null;
  is_indoor: boolean | null;
  status: string | null;
  source_type: string | null;
  source_url: string | null;
  source_file_url: string | null;
  admin_review_note: string | null;
};

type MerchantProfile = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string | null;
};

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

const PRICE_TYPES = [
  { value: "free", label: "免費" },
  { value: "paid", label: "收費" },
  { value: "mixed", label: "免費及收費" },
  { value: "unknown", label: "收費待確認" },
];

function toInputDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toInputTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function joinTags(tags: string[] | null) {
  return (tags || []).join(", ");
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "draft":
      return "草稿";
    case "submitted":
      return "審批中";
    case "rejected":
      return "待修改";
    case "published":
      return "已發布";
    case "archived":
      return "已封存";
    default:
      return "未確認";
  }
}

function getStatusClass(status: string | null) {
  switch (status) {
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "published":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "archived":
      return "bg-slate-100 text-slate-600";
    case "draft":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function isDistrictAcceptable(value: string) {
  const cleanedValue = value.trim();

  if (!cleanedValue) return false;
  if (cleanedValue === "待確認") return false;

  return true;
}

export default function MerchantEventEditPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = String(params.id || "");

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [eventData, setEventData] = useState<EditableEvent | null>(null);

  const [titleTc, setTitleTc] = useState("");
  const [shortDescriptionTc, setShortDescriptionTc] = useState("");
  const [descriptionTc, setDescriptionTc] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("待確認");
  const [mtrStation, setMtrStation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [priceType, setPriceType] = useState("unknown");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [category, setCategory] = useState("親子活動");
  const [tagsText, setTagsText] = useState("親子活動");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [isSenFriendly, setIsSenFriendly] = useState(false);
  const [isIndoor, setIsIndoor] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadEvent() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

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

      const { data: merchantData, error: merchantError } = await supabase
        .from("merchants")
        .select("id, business_name, contact_name, contact_email, status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (merchantError) {
        setErrorMessage(merchantError.message);
        setIsLoading(false);
        return;
      }

      if (!merchantData) {
        router.replace("/merchant/register");
        return;
      }

      const loadedMerchant = merchantData as MerchantProfile;
      setMerchant(loadedMerchant);

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
            "tags",
            "cover_image_url",
            "registration_required",
            "registration_url",
            "is_sen_friendly",
            "is_indoor",
            "status",
            "source_type",
            "source_url",
            "source_file_url",
            "admin_review_note",
          ].join(", ")
        )
        .eq("id", eventId)
        .eq("merchant_id", loadedMerchant.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("找不到活動，或你沒有權限修改此活動。");
        setIsLoading(false);
        return;
      }

      const loadedEvent = data as unknown as EditableEvent;
      setEventData(loadedEvent);

      setTitleTc(loadedEvent.title_tc || "");
      setShortDescriptionTc(loadedEvent.short_description_tc || "");
      setDescriptionTc(loadedEvent.description_tc || "");
      setOrganizerName(
        loadedEvent.organizer_name || loadedMerchant.business_name || ""
      );
      setVenueName(loadedEvent.venue_name || "");
      setAddress(loadedEvent.address || "");
      setDistrict(loadedEvent.district || "待確認");
      setMtrStation(loadedEvent.mtr_station || "");
      setStartDate(toInputDate(loadedEvent.start_date));
      setEndDate(toInputDate(loadedEvent.end_date));
      setStartTime(toInputTime(loadedEvent.start_time));
      setEndTime(toInputTime(loadedEvent.end_time));
      setPriceType(loadedEvent.price_type || "unknown");
      setPriceMin(
        loadedEvent.price_min === null || loadedEvent.price_min === undefined
          ? ""
          : String(loadedEvent.price_min)
      );
      setPriceMax(
        loadedEvent.price_max === null || loadedEvent.price_max === undefined
          ? ""
          : String(loadedEvent.price_max)
      );
      setCategory(loadedEvent.category || "親子活動");
      setTagsText(joinTags(loadedEvent.tags) || "親子活動");
      setCoverImageUrl(loadedEvent.cover_image_url || "");
      setRegistrationRequired(Boolean(loadedEvent.registration_required));
      setRegistrationUrl(loadedEvent.registration_url || "");
      setIsSenFriendly(Boolean(loadedEvent.is_sen_friendly));
      setIsIndoor(Boolean(loadedEvent.is_indoor));

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

  function validateForm() {
    const missing: string[] = [];

    if (!titleTc.trim()) missing.push("活動名稱");
    if (!shortDescriptionTc.trim()) missing.push("活動簡介");
    if (!descriptionTc.trim()) missing.push("活動詳情");
    if (!startDate) missing.push("開始日期");
    if (!venueName.trim()) missing.push("場地名稱");

    if (!isDistrictAcceptable(district)) {
      missing.push("地區，請選全港、多區、網上或實際地區，不要保留待確認");
    }

    if (!priceType || priceType === "unknown") missing.push("收費資料");

    return missing;
  }

  async function saveEvent() {
    if (!eventData) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const missing = validateForm();

    if (missing.length > 0) {
      setErrorMessage(`請先補充：${missing.join("、")}`);
      setIsSaving(false);
      return;
    }

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsSaving(false);
        return;
      }

      const cleanedPriceMin =
        priceMin.trim() === "" ? null : Number(priceMin.trim());
      const cleanedPriceMax =
        priceMax.trim() === "" ? null : Number(priceMax.trim());

      if (
        (cleanedPriceMin !== null && Number.isNaN(cleanedPriceMin)) ||
        (cleanedPriceMax !== null && Number.isNaN(cleanedPriceMax))
      ) {
        setErrorMessage("收費金額必須是數字。");
        setIsSaving(false);
        return;
      }

      const nextStatus =
        eventData.status === "published" || eventData.status === "submitted"
          ? eventData.status
          : "draft";

      const { error } = await supabase
        .from("events")
        .update({
          title_tc: titleTc.trim(),
          short_description_tc: shortDescriptionTc.trim(),
          description_tc: descriptionTc.trim(),
          organizer_name:
            organizerName.trim() || merchant?.business_name || null,
          venue_name: venueName.trim(),
          address: address.trim() || null,
          district: district.trim(),
          mtr_station: mtrStation.trim() || null,
          start_date: startDate || null,
          end_date: endDate || startDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          price_type: priceType,
          price_min: cleanedPriceMin,
          price_max: cleanedPriceMax,
          category: category.trim() || "親子活動",
          tags: splitTags(tagsText),
          cover_image_url: coverImageUrl.trim() || null,
          registration_required: registrationRequired,
          registration_url: registrationUrl.trim() || null,
          is_sen_friendly: isSenFriendly,
          is_indoor: isIndoor,
          status: nextStatus,
          admin_review_note: null,
          rejected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventData.id)
        .eq("merchant_id", eventData.merchant_id);

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }

      setEventData({
        ...eventData,
        title_tc: titleTc.trim(),
        short_description_tc: shortDescriptionTc.trim(),
        description_tc: descriptionTc.trim(),
        organizer_name:
          organizerName.trim() || merchant?.business_name || null,
        venue_name: venueName.trim(),
        address: address.trim() || null,
        district: district.trim(),
        mtr_station: mtrStation.trim() || null,
        start_date: startDate || null,
        end_date: endDate || startDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        price_type: priceType,
        price_min: cleanedPriceMin,
        price_max: cleanedPriceMax,
        category: category.trim() || "親子活動",
        tags: splitTags(tagsText),
        cover_image_url: coverImageUrl.trim() || null,
        registration_required: registrationRequired,
        registration_url: registrationUrl.trim() || null,
        is_sen_friendly: isSenFriendly,
        is_indoor: isIndoor,
        status: nextStatus,
        admin_review_note: null,
      });

      setSuccessMessage("活動資料已儲存。你可以返回 Preview 再提交審批。");
      setIsSaving(false);
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
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入活動修改頁...</p>
        </div>
      </main>
    );
  }

  if (!eventData) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">載入失敗</h1>
          <p className="mt-2 text-sm text-red-700">
            {errorMessage || "找不到活動資料。"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/merchant/dashboard")}
            className="mt-5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            返回 Dashboard
          </button>
        </div>
      </main>
    );
  }

  const isLocked =
    eventData.status === "submitted" || eventData.status === "published";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/merchant/dashboard")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            返回 Merchant Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(`/merchant/events/${eventData.id}/preview`)
            }
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            返回 Preview
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary-600">
                HK Family Fun Merchant Portal
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                修改活動資料
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                補充活動資料後，請返回 Preview 檢查，再提交 HK Family Fun 審批。
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                eventData.status
              )}`}
            >
              {getStatusLabel(eventData.status)}
            </span>
          </div>

          {eventData.status === "rejected" && eventData.admin_review_note ? (
            <div className="mt-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-bold">HK Family Fun 退回原因</div>
                <div className="mt-1">{eventData.admin_review_note}</div>
              </div>
            </div>
          ) : null}

          {isLocked ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              此活動目前是「{getStatusLabel(eventData.status)}」，不建議直接修改。
              如需要修改已發布活動，之後應建立「修改後重新審批」流程。
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <FormSection
              title="基本資料"
              icon={<FileText className="h-5 w-5" />}
            >
              <TextInput
                label="活動名稱"
                value={titleTc}
                onChange={setTitleTc}
                placeholder="例如：Summer Library Festival 2026 夏日圖書館節"
              />

              <TextArea
                label="活動簡介"
                value={shortDescriptionTc}
                onChange={setShortDescriptionTc}
                rows={3}
                placeholder="一句至兩句介紹活動，會顯示在活動卡。"
              />

              <TextArea
                label="活動詳情"
                value={descriptionTc}
                onChange={setDescriptionTc}
                rows={7}
                placeholder="詳細介紹活動內容、適合年齡、活動亮點、家長注意事項。"
              />

              <TextInput
                label="主辦單位"
                value={organizerName}
                onChange={setOrganizerName}
                placeholder="例如：Hong Kong Public Libraries"
              />

              <TextInput
                label="活動分類"
                value={category}
                onChange={setCategory}
                placeholder="例如：親子活動、工作坊、展覽"
              />

              <TextInput
                label="標籤 Tags，用英文逗號分隔"
                value={tagsText}
                onChange={setTagsText}
                placeholder="例如：親子活動, 閱讀, 免費活動"
              />
            </FormSection>

            <FormSection
              title="日期、時間及地點"
              icon={<CalendarDays className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="開始日期"
                  type="date"
                  value={startDate}
                  onChange={setStartDate}
                />

                <TextInput
                  label="結束日期"
                  type="date"
                  value={endDate}
                  onChange={setEndDate}
                />

                <TextInput
                  label="開始時間"
                  type="time"
                  value={startTime}
                  onChange={setStartTime}
                />

                <TextInput
                  label="結束時間"
                  type="time"
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>

              <TextInput
                label="場地名稱"
                value={venueName}
                onChange={setVenueName}
                placeholder="例如：香港公共圖書館各分館及網上活動"
                icon={<MapPin className="h-4 w-4" />}
              />

              <TextInput
                label="詳細地址"
                value={address}
                onChange={setAddress}
                placeholder="例如：香港公共圖書館各指定分館；部分活動為網上或外展活動"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    地區
                  </span>
                  <select
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  >
                    {DISTRICTS.map((districtOption) => (
                      <option key={districtOption} value={districtOption}>
                        {districtOption}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    大型活動可選「全港」或「多區」；純網上活動可選「網上」。
                  </p>
                </label>

                <TextInput
                  label="港鐵站"
                  value={mtrStation}
                  onChange={setMtrStation}
                  placeholder="例如：多個港鐵站／視乎分館而定"
                />
              </div>
            </FormSection>

            <FormSection title="收費及報名" icon={<Ticket className="h-5 w-5" />}>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  收費類型
                </span>

                <select
                  value={priceType}
                  onChange={(event) => setPriceType(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {PRICE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="最低收費 HK$"
                  type="number"
                  value={priceMin}
                  onChange={setPriceMin}
                  placeholder="例如：0"
                  icon={<DollarSign className="h-4 w-4" />}
                />

                <TextInput
                  label="最高收費 HK$"
                  type="number"
                  value={priceMax}
                  onChange={setPriceMax}
                  placeholder="例如：120"
                  icon={<DollarSign className="h-4 w-4" />}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={registrationRequired}
                    onChange={(event) =>
                      setRegistrationRequired(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  需要預先報名
                </label>
              </div>

              <TextInput
                label="報名 URL"
                value={registrationUrl}
                onChange={setRegistrationUrl}
                placeholder="例如：https://..."
                icon={<LinkIcon className="h-4 w-4" />}
              />
            </FormSection>
          </div>

          <aside className="space-y-6">
            <FormSection title="圖片及屬性" icon={<Clock className="h-5 w-5" />}>
              <TextInput
                label="封面圖片 URL"
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                placeholder="例如：https://..."
              />

              {coverImageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <img
                    src={coverImageUrl}
                    alt="活動封面預覽"
                    className="h-44 w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isSenFriendly}
                    onChange={(event) => setIsSenFriendly(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  SEN 友善
                </label>

                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isIndoor}
                    onChange={(event) => setIsIndoor(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                  室內活動
                </label>
              </div>
            </FormSection>

            <FormSection title="來源資料" icon={<LinkIcon className="h-5 w-5" />}>
              <InfoRow label="匯入方式" value={eventData.source_type || "manual"} />
              <InfoRow label="來源網址" value={eventData.source_url || "未有"} />
              <InfoRow
                label="來源檔案"
                value={eventData.source_file_url || "未有"}
              />
            </FormSection>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={saveEvent}
                disabled={isSaving || isLocked}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "儲存中..." : "儲存修改"}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(`/merchant/events/${eventData.id}/preview`)
                }
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                返回 Preview
              </button>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                儲存後請返回 Preview 檢查活動卡，再提交 HK Family Fun 審批。
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-950">
        <span className="text-primary-500">{icon}</span>
        {title}
      </h2>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>

      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
        {icon ? <span className="text-slate-400">{icon}</span> : null}

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="font-semibold text-slate-500">{label}</div>
      <div className="mt-1 break-all text-slate-800">{value}</div>
    </div>
  );
}