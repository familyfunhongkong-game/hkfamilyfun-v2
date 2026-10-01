import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SOURCE_FIELDS = [
  "title_tc",
  "short_description_tc",
  "description_tc",
  "venue_name",
  "address",
] as const;

type SourceField = (typeof SOURCE_FIELDS)[number];

type AzureTranslation = {
  text?: string;
  to?: string;
};

type AzureResult = {
  translations?: AzureTranslation[];
};

function targetField(source: SourceField, language: "zh-Hans" | "en") {
  const suffix = language === "zh-Hans" ? "sc" : "en";

  if (source === "title_tc") return `title_${suffix}`;
  if (source === "short_description_tc") return `short_description_${suffix}`;
  if (source === "description_tc") return `description_${suffix}`;
  if (source === "venue_name") return `venue_name_${suffix}`;
  return `address_${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "請先登入商戶或管理員帳戶。" },
        { status: 401 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: "系統暫時未能連接帳戶服務。" },
        { status: 503 },
      );
    }

    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "登入狀態已失效，請重新登入。" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const eventId = String(body?.event_id || "").trim();

    if (!eventId) {
      return NextResponse.json(
        { ok: false, error: "找不到活動 ID。" },
        { status: 400 },
      );
    }

    const { data: adminAccess } = await authClient.rpc("is_platform_admin");
    const isAdmin = adminAccess === true;

    const { data: merchant } = await authClient
      .from("merchants")
      .select("id,status")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (!isAdmin && (!merchant || merchant.status !== "approved")) {
      return NextResponse.json(
        { ok: false, error: "商戶帳戶尚未獲批准，暫時不能使用自動翻譯。" },
        { status: 403 },
      );
    }

    const { data: eventRecord, error: eventError } = await authClient
      .from("events")
      .select("id,merchant_id,status")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !eventRecord) {
      return NextResponse.json(
        { ok: false, error: "你沒有權限翻譯此活動，或活動不存在。" },
        { status: 403 },
      );
    }

    if (
      !isAdmin &&
      (eventRecord.merchant_id !== merchant?.id ||
        !["draft", "rejected"].includes(String(eventRecord.status || "")))
    ) {
      return NextResponse.json(
        { ok: false, error: "此活動目前不可由商戶修改翻譯。" },
        { status: 403 },
      );
    }

    const key = String(process.env.AZURE_TRANSLATOR_KEY || "").trim();
    const region = String(process.env.AZURE_TRANSLATOR_REGION || "").trim();
    const endpoint = String(
      process.env.AZURE_TRANSLATOR_ENDPOINT ||
        "https://api.cognitive.microsofttranslator.com",
    )
      .trim()
      .replace(/\/$/, "");

    if (!key || !region) {
      return NextResponse.json(
        {
          ok: false,
          code: "translator_not_configured",
          error:
            "自動翻譯尚未設定。繁／簡／英手動欄位仍可正常使用；設定 Azure Translator F0 後即可啟用一鍵翻譯。",
        },
        { status: 503 },
      );
    }

    const submitted = body?.fields && typeof body.fields === "object"
      ? body.fields
      : {};

    const inputs = SOURCE_FIELDS.map((field) => ({
      field,
      text: String(submitted[field] || "").trim(),
    })).filter((item) => item.text);

    if (!inputs.length) {
      return NextResponse.json(
        { ok: false, error: "請先輸入繁中活動內容。" },
        { status: 400 },
      );
    }

    const totalCharacters = inputs.reduce(
      (sum, item) => sum + item.text.length,
      0,
    );

    if (
      totalCharacters > 15000 ||
      inputs.some((item) => item.text.length > 6000)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "翻譯內容過長。請縮短活動內容後再試，以控制成本及避免逾時。",
        },
        { status: 413 },
      );
    }

    const url = new URL(`${endpoint}/translate`);
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("from", "zh-Hant");
    url.searchParams.append("to", "zh-Hans");
    url.searchParams.append("to", "en");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
      },
      body: JSON.stringify(inputs.map((item) => ({ Text: item.text }))),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;

      return NextResponse.json(
        {
          ok: false,
          error: retryable
            ? "翻譯服務暫時繁忙，請稍後再試；現有活動資料不受影響。"
            : "翻譯服務設定或配額有問題，請由管理員檢查 Azure Translator。",
        },
        { status: retryable ? 503 : 502 },
      );
    }

    const results = (await response.json()) as AzureResult[];

    if (!Array.isArray(results) || results.length !== inputs.length) {
      return NextResponse.json(
        { ok: false, error: "翻譯服務回傳格式不完整，請稍後再試。" },
        { status: 502 },
      );
    }

    const translations: Record<string, string> = {};

    results.forEach((result, index) => {
      const source = inputs[index].field;

      for (const item of result.translations || []) {
        if (item.to !== "zh-Hans" && item.to !== "en") continue;

        const text = String(item.text || "").trim();
        if (!text) continue;

        translations[targetField(source, item.to)] = text;
      }
    });

    return NextResponse.json({
      ok: true,
      provider: "azure-translator",
      source_language: "zh-Hant",
      translated_characters: totalCharacters,
      translations,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "自動翻譯暫時未能完成。現有活動資料未有任何更改。",
      },
      { status: 500 },
    );
  }
}
