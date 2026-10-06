import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value || "").trim();
}

function fallbackCopy(input: {
  title: string;
  description: string;
  date: string;
  venue: string;
  price: string;
  link: string;
  channel: string;
}) {
  const lines = [
    "🔥【" + input.title + "】",
    "",
    input.description || "又有親子活動新發現！",
    "",
    input.date ? "📅 " + input.date : "",
    input.venue ? "📍 " + input.venue : "",
    input.price ? "💰 " + input.price : "",
    "",
    input.link ? "🔗 詳情／報名：" + input.link : "詳情請參閱活動官方資料。",
    "",
    "⚠️ 活動資料或會更改，出發前請向主辦單位確認最新安排。",
    "",
    "#HKFamilyFun #香港親子活動 #親子好去處",
  ].filter(Boolean);

  if (input.channel === "threads") {
    return lines.join("\n").slice(0, 1800);
  }

  return lines.join("\n").slice(0, 2200);
}

async function generateWithOpenAI(prompt: string) {
  const apiKey = clean(process.env.OPENAI_API_KEY);
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: clean(process.env.OPENAI_MODEL) || "gpt-5.6",
    input: prompt,
  });

  return clean(response.output_text) || null;
}

export async function POST(request: NextRequest) {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon =
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!url || !anon || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await client.rpc("is_platform_admin");
  if (isAdmin !== true) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const sourceType = clean(body?.source_type);
  const sourceId = clean(body?.source_id);
  const channel = ["instagram", "facebook", "threads", "all"].includes(clean(body?.channel))
    ? clean(body.channel)
    : "all";

  if (!sourceId || !["event", "article"].includes(sourceType)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  let sourceEventId: string | null = null;
  let sourceArticleId: string | null = null;
  let title = "";
  let description = "";
  let date = "";
  let venue = "";
  let price = "";
  let link = "";

  if (sourceType === "event") {
    const { data, error } = await client
      .from("events")
      .select(
        "id,title_tc,short_description_tc,description_tc,start_date,end_date,start_time,end_time,venue_name,district,price_label,price_display_mode,min_price,registration_url,booking_url,official_url,source_url,status",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    sourceEventId = data.id;
    title = clean(data.title_tc);
    description = clean(data.short_description_tc || data.description_tc).slice(0, 700);
    date = [clean(data.start_date), clean(data.end_date) && data.end_date !== data.start_date ? "至 " + clean(data.end_date) : "", clean(data.start_time), clean(data.end_time) ? "–" + clean(data.end_time) : ""].filter(Boolean).join(" ");
    venue = [clean(data.venue_name), clean(data.district)].filter(Boolean).join("・");
    price =
      clean(data.price_label) ||
      (data.price_display_mode === "free" ? "免費" : clean(data.min_price) ? "HK$" + clean(data.min_price) + " 起" : "");
    link = clean(data.registration_url || data.booking_url || data.official_url || data.source_url);
  } else {
    const { data, error } = await client
      .from("content_articles")
      .select("id,title_tc,excerpt_tc,body_tc,source_url,status")
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    sourceArticleId = data.id;
    title = clean(data.title_tc);
    description = clean(data.excerpt_tc || data.body_tc).slice(0, 700);
    link = clean(data.source_url);
  }

  const existingDraft = sourceEventId
    ? await client
        .from("social_content_drafts")
        .select("id,copy_text,generated_by_ai,status")
        .eq("source_event_id", sourceEventId)
        .eq("channel", channel)
        .in("status", ["draft", "ready"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await client
        .from("social_content_drafts")
        .select("id,copy_text,generated_by_ai,status")
        .eq("source_article_id", sourceArticleId)
        .eq("channel", channel)
        .in("status", ["draft", "ready"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!existingDraft.error && existingDraft.data) {
    return NextResponse.json({
      ok: true,
      id: existingDraft.data.id,
      copy_text: existingDraft.data.copy_text,
      generated_by_ai: existingDraft.data.generated_by_ai,
      provider: "existing_draft",
      reused: true,
    });
  }

  const base = {
    title,
    description,
    date,
    venue,
    price,
    link,
    channel,
  };

  const prompt = [
    "你係 HK Family Fun 香港親子活動平台內容編輯。",
    "請根據以下已核實資料，寫一篇可以直接貼到社交媒體的繁體廣東話文案。",
    "不可發明日期、時間、價錢、名額、優惠、地點或主辦資料。",
    "資料不完整就省略，不要猜。",
    "語氣自然、親子媒體、容易掃讀，不要寫成硬銷廣告。",
    "如屬付費或合作內容，只可在來源明確標示時寫 Sponsored；本次不要自行加。",
    "Channel: " + channel,
    "Title: " + title,
    "Description: " + description,
    "Date/time: " + date,
    "Venue: " + venue,
    "Price: " + price,
    "Official link: " + link,
    "最後加一行資料更新提醒，以及 3-5 個相關 hashtag。",
    channel === "threads"
      ? "控制在 1800 字內。"
      : "控制在 2200 字內。",
  ].join("\n");

  let copyText: string | null = null;
  let generatedByAi = false;

  try {
    copyText = await generateWithOpenAI(prompt);
    generatedByAi = Boolean(copyText);
  } catch (error) {
    console.error("AI social draft generation failed:", error);
  }

  if (!copyText) {
    copyText = fallbackCopy(base);
  }

  const { data: saved, error: saveError } = await client
    .from("social_content_drafts")
    .insert({
      source_event_id: sourceEventId,
      source_article_id: sourceArticleId,
      channel,
      locale: "zh-Hant",
      status: "draft",
      title,
      copy_text: copyText,
      image_brief: sourceType === "event"
        ? "優先使用活動官方原圖／海報，不修改主體內容；加簡潔 HK Family Fun 資訊層。"
        : "使用文章主圖，保持 editorial image-led 版面。",
      generated_by_ai: generatedByAi,
    })
    .select("id,copy_text,generated_by_ai")
    .single();

  if (saveError || !saved) {
    return NextResponse.json(
      { error: saveError?.message || "Could not save social draft" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: saved.id,
    copy_text: saved.copy_text,
    generated_by_ai: saved.generated_by_ai,
    provider: generatedByAi ? "openai" : "template_fallback",
  });
}
