import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

type JsonMap = Record<string, unknown>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s_*（）()\[\]【】:：/\\.\-]+/g, "");
}

function pick(payload: JsonMap, aliases: string[]) {
  const entries = Object.entries(payload).map(([name, value]) => ({
    name: normalizeKey(name),
    value: clean(value),
  }));

  for (const alias of aliases) {
    const key = normalizeKey(alias);
    const exact = entries.find((entry) => entry.name === key && entry.value);
    if (exact) return exact.value;

    const partial = entries.find(
      (entry) =>
        entry.value &&
        key.length >= 3 &&
        (entry.name.includes(key) || key.includes(entry.name)),
    );
    if (partial) return partial.value;
  }

  return "";
}

function dateOnly(value: string) {
  const iso = value.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
  if (!iso) return null;
  return iso[1] + "-" + iso[2].padStart(2, "0") + "-" + iso[3].padStart(2, "0");
}

function timeOnly(value: string) {
  const match = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return match ? match[1].padStart(2, "0") + ":" + match[2] : null;
}

function sanitizeAiNormalized(
  candidate: JsonMap,
  baseline: JsonMap,
): JsonMap {
  const stringKeys = [
    "title_tc",
    "title_sc",
    "title_en",
    "short_description_tc",
    "venue_name",
    "address",
    "district",
    "mtr_station",
    "activity_category",
    "price_display_mode",
    "price_label",
    "registration_url",
    "official_url",
    "google_map_url",
    "cover_image_url",
    "organizer_name",
    "contact_email",
    "contact_phone",
    "whatsapp",
  ] as const;

  const next: JsonMap = { ...baseline };

  for (const key of stringKeys) {
    if (!(key in candidate)) continue;
    const value = candidate[key];
    if (value === null) {
      next[key] = null;
      continue;
    }
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    next[key] = trimmed || null;
  }

  for (const key of ["start_date", "end_date"] as const) {
    if (!(key in candidate)) continue;
    const value = candidate[key];
    if (value === null) {
      next[key] = null;
      continue;
    }
    if (typeof value !== "string") continue;
    const normalized = dateOnly(value);
    if (normalized) next[key] = normalized;
  }

  for (const key of ["start_time", "end_time"] as const) {
    if (!(key in candidate)) continue;
    const value = candidate[key];
    if (value === null) {
      next[key] = null;
      continue;
    }
    if (typeof value !== "string") continue;
    const normalized = timeOnly(value);
    if (normalized) next[key] = normalized;
  }

  if ("min_price" in candidate) {
    const value = candidate.min_price;
    if (value === null) next.min_price = null;
    else {
      const number = Number(value);
      if (Number.isFinite(number) && number >= 0) next.min_price = number;
    }
  }

  if (Array.isArray(candidate.tags)) {
    next.tags = candidate.tags
      .map((item) => clean(item))
      .filter(Boolean)
      .slice(0, 30);
  }

  return next;
}

function looksLikeIsoDate(value: unknown) {
  return /^20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(clean(value));
}

function hkToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function detectSchemaDrift(payload: JsonMap) {
  const reasons: string[] = [];

  const englishTitle = pick(payload, ["英文標題", "Event Title (English)", "title_en"]);
  const simplifiedTitle = pick(payload, ["簡體中文標題", "title_sc"]);
  const startDate = pick(payload, ["開始日期 *", "Event Start Date 活動開始日期", "start_date"]);

  if (!startDate && looksLikeIsoDate(englishTitle)) {
    reasons.push("英文標題欄出現日期，懷疑 row 使用另一套精簡欄位格式");
  }

  if (!startDate && looksLikeIsoDate(simplifiedTitle)) {
    reasons.push("簡體標題欄出現日期，懷疑欄位已錯位");
  }

  return reasons;
}

function fallback(payload: JsonMap) {
  const priceText = pick(payload, ["票價 (HKD)", "價格 (HKD)", "價錢", "price", "price_label"]);
  const freeText = pick(payload, ["是否免費", "活動屬性(SEN/FREE)", "免費", "price_type"]);
  const isFree = /免費|\bfree\b|^yes$|^true$/i.test(freeText + " " + priceText);
  const numeric = Number(priceText.replace(/[^0-9.]/g, ""));
  const tags = pick(payload, ["標籤 (逗號分隔)", "標籤 & 關鍵詞", "標籤", "tags"])
    .split(/[,，、;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

  return {
    title_tc: pick(payload, ["Event Title (Chinese)", "活動標題 *", "活動名稱(繁體)", "活動名稱(中", "活動標題", "title_tc", "title"]),
    title_sc: pick(payload, ["簡體中文標題", "活動名稱(簡體)", "title_sc"]) || null,
    title_en: pick(payload, ["Event Title (English)", "英文標題", "活動名稱(英文)", "title_en"]) || null,
    short_description_tc: pick(payload, ["Event Highlights / Description", "活動亮點 / 簡介", "活動簡介 *", "活動描述(繁體)", "活動詳情(中文)", "活動簡介", "description_tc"]) || null,
    venue_name: pick(payload, ["Venue Name 活動場地名稱", "活動地點 *", "活動地點(繁體)", "活動地點", "場地", "venue_name"]) || null,
    address: pick(payload, ["Venue Address 活動場地地址", "詳細地址", "Merchant Address", "address"]) || null,
    district: pick(payload, ["Event Region 活動區域", "活動區域", "地區", "district"]) || null,
    mtr_station: pick(payload, ["MTR Stations 港鐵站名", "最近地鐵站", "港鐵站", "mtr_station"]) || null,
    start_date: dateOnly(pick(payload, ["Event Start Date 活動開始日期", "開始日期 *", "開始日期", "start_date"])),
    end_date: dateOnly(pick(payload, ["Event End Date 活動結束日期", "結束日期 *", "結束日期", "end_date"])),
    start_time: timeOnly(pick(payload, ["Event Start Time 活動開始時間", "開始時間 *", "開始時間", "start_time"])),
    end_time: timeOnly(pick(payload, ["Event End Time 活動結束時間", "結束時間 *", "結束時間", "end_time"])),
    activity_category: pick(payload, ["Event Type 活動類型", "活動類型", "分類", "activity_category"]) || null,
    price_display_mode: isFree ? "free" : Number.isFinite(numeric) ? "from" : null,
    min_price: isFree ? 0 : Number.isFinite(numeric) ? numeric : null,
    price_label: priceText || (isFree ? "免費" : null),
    registration_url: pick(payload, ["Enter registration URL", "請填寫報名網址", "外部報名鏈接", "官方網站 / 報名鏈接", "registration_url", "booking_url"]) || null,
    official_url: pick(payload, ["Website 官方網站", "外部連結", "外部鏈接", "官方網站 / 報名鏈接", "official_url", "source_url"]) || null,
    google_map_url: pick(payload, ["Google Maps 連結", "活動地點 Google Maps", "google_map_url"]) || null,
    cover_image_url: pick(payload, ["Event Image upload 活動圖片上傳", "活動圖片 URL", "cover_image_url"]) || null,
    organizer_name: pick(payload, ["Merchant Name 商戶名稱 (中)", "Merchant Name 商戶名稱 (Eng)", "主辦單位", "organizer_name"]) || null,
    contact_email: pick(payload, ["Email 電郵地址", "聯繫郵箱", "contact_email"]) || null,
    contact_phone: pick(payload, ["Contact Phone 聯絡電話", "聯繫電話", "contact_phone"]) || null,
    whatsapp: pick(payload, ["What's app 聯絡號碼", "WhatsApp號碼", "whatsapp"]) || null,
    tags,
  };
}

async function normalizeWithAi(payload: JsonMap, baseline: JsonMap) {
  const apiKey = clean(process.env.OPENAI_API_KEY);
  if (!apiKey) return { value: baseline, ai: false };

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: clean(process.env.OPENAI_MODEL) || "gpt-5.6",
      input:
        "Normalize this HK family event intake into JSON. Never invent facts. " +
        "Only use these keys: title_tc,title_sc,title_en,short_description_tc,venue_name,address,district,mtr_station,start_date,end_date,start_time,end_time,activity_category,price_display_mode,min_price,price_label,registration_url,official_url,google_map_url,cover_image_url,organizer_name,contact_email,contact_phone,whatsapp,tags. " +
        "Dates must be YYYY-MM-DD only when clearly supported; times HH:MM only when clearly supported. " +
        "Return JSON only.\nSOURCE=" + JSON.stringify(payload) +
        "\nBASELINE=" + JSON.stringify(baseline),
    });
    const raw = clean(response.output_text)
      .replace(/^\x60\x60\x60json\s*/i, "")
      .replace(/\x60\x60\x60$/i, "");
    const parsed = JSON.parse(raw) as JsonMap;
    return {
      value: sanitizeAiNormalized(parsed, baseline),
      ai: true,
    };
  } catch {
    return { value: baseline, ai: false };
  }
}

export async function normalizeIntakeSubmission(
  client: SupabaseClient,
  intakeId: string,
) {
  const id = clean(intakeId);
  if (!id) {
    return { ok: false as const, status: 400, error: "Missing intake id" };
  }

  const intake = await client
    .from("intake_submissions")
    .select("id,payload")
    .eq("id", id)
    .maybeSingle();

  if (intake.error || !intake.data) {
    return {
      ok: false as const,
      status: 404,
      error: intake.error?.message || "Intake not found",
    };
  }

  const payload = (intake.data.payload || {}) as JsonMap;
  const schemaDriftReasons = detectSchemaDrift(payload);
  const result = await normalizeWithAi(payload, fallback(payload) as JsonMap);
  const title = clean(result.value.title_tc);
  const startDate = clean(result.value.start_date);
  const endDate = clean(result.value.end_date);
  const validationReasons = [...schemaDriftReasons];

  if ((endDate || startDate) && (endDate || startDate) < hkToday()) {
    validationReasons.push("活動日期已過，禁止自動升級為可發佈 Draft");
  }

  let duplicates: unknown[] = [];

  if (title) {
    let query = client
      .from("events")
      .select("id,title_tc,start_date,status")
      .ilike("title_tc", "%" + title.slice(0, 70) + "%")
      .limit(8);

    if (startDate) query = query.eq("start_date", startDate);
    const found = await query;
    if (!found.error) duplicates = found.data || [];
  }

  const normalized = {
    ...result.value,
    normalization: {
      generated_by_ai: result.ai,
      normalized_at: new Date().toISOString(),
      duplicate_candidates: duplicates,
      schema_drift_detected: schemaDriftReasons.length > 0,
      schema_drift_reasons: schemaDriftReasons,
      validation_reasons: validationReasons,
    },
  };

  const nextStatus =
    validationReasons.length || duplicates.length
      ? "needs_review"
      : "normalized";

  const saved = await client
    .from("intake_submissions")
    .update({
      normalized_payload: normalized,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (saved.error) {
    return { ok: false as const, status: 500, error: saved.error.message };
  }

  return {
    ok: true as const,
    status: 200,
    intake_status: nextStatus,
    generated_by_ai: result.ai,
    duplicate_candidates: duplicates,
    schema_drift_reasons: schemaDriftReasons,
    validation_reasons: validationReasons,
    normalized_payload: normalized,
  };
}
