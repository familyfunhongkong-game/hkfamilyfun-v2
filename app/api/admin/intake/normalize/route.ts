import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

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
    return { value: { ...baseline, ...(JSON.parse(raw) as JsonMap) }, ai: true };
  } catch {
    return { value: baseline, ai: false };
  }
}

export async function POST(request: NextRequest) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = await request.json();
  const id = clean(body?.id);
  if (!id) return NextResponse.json({ error: "Missing intake id" }, { status: 400 });

  const intake = await admin.client
    .from("intake_submissions")
    .select("id,payload")
    .eq("id", id)
    .maybeSingle();

  if (intake.error || !intake.data) {
    return NextResponse.json({ error: intake.error?.message || "Intake not found" }, { status: 404 });
  }

  const payload = (intake.data.payload || {}) as JsonMap;
  const result = await normalizeWithAi(payload, fallback(payload) as JsonMap);
  const title = clean(result.value.title_tc);
  const startDate = clean(result.value.start_date);
  let duplicates: unknown[] = [];

  if (title) {
    let query = admin.client
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
    },
  };

  const saved = await admin.client
    .from("intake_submissions")
    .update({
      normalized_payload: normalized,
      status: duplicates.length ? "needs_review" : "normalized",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    generated_by_ai: result.ai,
    duplicate_candidates: duplicates,
    normalized_payload: normalized,
  });
}
