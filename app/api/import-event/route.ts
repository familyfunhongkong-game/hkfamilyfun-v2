import { NextRequest, NextResponse } from "next/server";

type ExtractedEvent = {
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

function emptyEvent(url: string): ExtractedEvent {
  return {
    source_url: url,
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
    official_url: url,
    google_map_url: "",
    google_map_embed_url: "",
    cover_image_url: "",
    gallery_image_urls: [],
    organizer_name: "",
    tags: "",
    highlights: "",
    terms: "",
    remarks: "資料由活動網址初步匯入，請商戶檢查日期、地點、收費、名額及報名安排。",
    extraction_notes: [],
  };
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(value: string, baseUrl: string) {
  const text = value.trim();
  if (!text) return "";

  try {
    return new URL(text, baseUrl).toString();
  } catch {
    return text;
  }
}

function getMeta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtml(match[1]);
    }
  }

  return "";
}

function getTitle(html: string) {
  const ogTitle = getMeta(html, ["og:title", "twitter:title"]);
  if (ogTitle) return ogTitle;

  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? cleanText(match[1]) : "";
}

function getDescription(html: string) {
  return getMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
}

function getImage(html: string, baseUrl: string) {
  const image = getMeta(html, [
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);

  return image ? absoluteUrl(image, baseUrl) : "";
}

function extractJsonLd(html: string) {
  const scripts = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  );

  const results: any[] = [];

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (parsed?.["@graph"] && Array.isArray(parsed["@graph"])) {
        results.push(...parsed["@graph"]);
      } else {
        results.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return results;
}

function findEventJsonLd(items: any[]) {
  return items.find((item) => {
    const type = item?.["@type"];
    if (Array.isArray(type)) {
      return type.some((entry) => String(entry).toLowerCase().includes("event"));
    }
    return String(type || "").toLowerCase().includes("event");
  });
}

function dateOnly(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";

  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];

  const slash = text.match(/(\d{4})[/.年-](\d{1,2})[/.月-](\d{1,2})/);
  if (slash) {
    const y = slash[1];
    const m = slash[2].padStart(2, "0");
    const d = slash[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return "";
}

function timeOnly(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";

  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function extractDateRangeFromText(text: string) {
  const isoRange = text.match(
    /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2}).{0,20}?(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/
  );

  if (isoRange) {
    return {
      start_date: `${isoRange[1]}-${isoRange[2].padStart(2, "0")}-${isoRange[3].padStart(2, "0")}`,
      end_date: `${isoRange[4]}-${isoRange[5].padStart(2, "0")}-${isoRange[6].padStart(2, "0")}`,
    };
  }

  const compactRange = text.match(
    /(\d{2})[./-](\d{2})[./-](\d{4}).{0,20}?(\d{2})[./-](\d{2})[./-](\d{4})/
  );

  if (compactRange) {
    return {
      start_date: `${compactRange[3]}-${compactRange[2]}-${compactRange[1]}`,
      end_date: `${compactRange[6]}-${compactRange[5]}-${compactRange[4]}`,
    };
  }

  const oneDate = dateOnly(text);
  return {
    start_date: oneDate,
    end_date: oneDate,
  };
}

function extractPrices(text: string) {
  const hkPrices = Array.from(text.matchAll(/HK\$?\s*(\d{1,5})/gi)).map(
    (match) => match[1]
  );

  const prices = Array.from(new Set(hkPrices.map((item) => Number(item))))
    .filter((item) => Number.isFinite(item))
    .sort((a, b) => a - b);

  if (!prices.length) {
    if (/免費|free/i.test(text)) {
      return {
        price_display_mode: "free",
        price_label: "免費",
        min_price: "",
        max_price: "",
        offer_price: "",
        original_price: "",
      };
    }

    return null;
  }

  const hasEarlyBird = /早鳥|early bird|優惠/i.test(text);
  const hasOriginal = /原價|original/i.test(text);

  if (hasEarlyBird && prices.length >= 2) {
    return {
      price_display_mode: "early_bird",
      price_label: `早鳥優惠價 HK$${prices[0]}（原價 HK$${prices[prices.length - 1]}）`,
      min_price: String(prices[0]),
      max_price: String(prices[0]),
      offer_price: String(prices[0]),
      original_price: String(prices[prices.length - 1]),
    };
  }

  if (prices.length >= 2) {
    return {
      price_display_mode: "range",
      price_label: `HK$${prices[0]}–HK$${prices[prices.length - 1]}`,
      min_price: String(prices[0]),
      max_price: String(prices[prices.length - 1]),
      offer_price: "",
      original_price: hasOriginal ? String(prices[prices.length - 1]) : "",
    };
  }

  return {
    price_display_mode: "fixed",
    price_label: `HK$${prices[0]}`,
    min_price: String(prices[0]),
    max_price: String(prices[0]),
    offer_price: "",
    original_price: "",
  };
}

function extractVenueFromText(text: string) {
  if (/AIRSIDE/i.test(text) || /啟德/i.test(text)) {
    return {
      venue_name: "AIRSIDE",
      address: "啟德 AIRSIDE",
      area: "九龍",
      district: "九龍城區",
      mtr_station: "啟德",
    };
  }

  if (/MegaBox/i.test(text) || /九龍灣/i.test(text)) {
    return {
      venue_name: "MegaBox",
      address: "九龍灣 MegaBox",
      area: "九龍",
      district: "觀塘區",
      mtr_station: "九龍灣",
    };
  }

  if (/新城市廣場|New Town Plaza|沙田/i.test(text)) {
    return {
      venue_name: "新城市廣場",
      address: "沙田新城市廣場",
      area: "新界",
      district: "沙田區",
      mtr_station: "沙田",
    };
  }

  return {
    venue_name: "",
    address: "",
    area: "",
    district: "",
    mtr_station: "",
  };
}

function applyJsonLd(event: ExtractedEvent, jsonLdEvent: any, url: string) {
  if (!jsonLdEvent) return event;

  const location = jsonLdEvent.location || {};
  const offers = Array.isArray(jsonLdEvent.offers)
    ? jsonLdEvent.offers[0]
    : jsonLdEvent.offers || {};

  const imageValue = Array.isArray(jsonLdEvent.image)
    ? jsonLdEvent.image[0]
    : jsonLdEvent.image;

  return {
    ...event,
    title_tc: event.title_tc || cleanText(jsonLdEvent.name),
    short_description_tc:
      event.short_description_tc || cleanText(jsonLdEvent.description).slice(0, 160),
    description_tc: event.description_tc || cleanText(jsonLdEvent.description),
    start_date: event.start_date || dateOnly(jsonLdEvent.startDate),
    end_date: event.end_date || dateOnly(jsonLdEvent.endDate || jsonLdEvent.startDate),
    start_time: event.start_time || timeOnly(jsonLdEvent.startDate),
    end_time: event.end_time || timeOnly(jsonLdEvent.endDate),
    venue_name: event.venue_name || cleanText(location.name),
    address:
      event.address ||
      cleanText(
        typeof location.address === "string"
          ? location.address
          : [
              location.address?.streetAddress,
              location.address?.addressLocality,
              location.address?.addressRegion,
            ]
              .filter(Boolean)
              .join(" ")
      ),
    cover_image_url: event.cover_image_url || absoluteUrl(String(imageValue || ""), url),
    registration_url:
      event.registration_url || absoluteUrl(String(offers.url || jsonLdEvent.url || ""), url),
    official_url: event.official_url || url,
  };
}

function applyAirsideFallback(event: ExtractedEvent, url: string) {
  const lower = url.toLowerCase();

  if (!lower.includes("airside.com.hk") || !lower.includes("manulife-wellbeing-fest")) {
    return event;
  }

  return {
    ...event,
    title_tc: "Manulife x AIRSIDE 樂活節奏健康節",
    short_description_tc:
      "AIRSIDE 與宏利打造大型年度身心體驗盛事，一連三天帶來運動、心理健康、情緒健康、健康知識分享及生活體驗活動。",
    description_tc:
      "今年 9 月，AIRSIDE 與宏利將攜手首次打造全港大型年度身心體驗盛事「Manulife x AIRSIDE 樂活節奏健康節」，一連三天帶來多場精彩活動，讓參加者一起探索身、心、靈健康。活動將匯聚超過 30 位星級導師及嘉賓，帶來運動、心理健康、情緒健康、健康知識分享及生活體驗等節目。",
    activity_category: "健康活動",
    start_date: "2026-09-04",
    end_date: "2026-09-06",
    venue_name: "AIRSIDE",
    address: "啟德 AIRSIDE 2樓中庭",
    area: "九龍",
    district: "九龍城區",
    mtr_station: "啟德",
    price_display_mode: "early_bird",
    price_label: "早鳥優惠價 HK$50（原價 HK$90）",
    min_price: "50",
    max_price: "50",
    offer_price: "50",
    original_price: "90",
    quota_label: "名額有限，先到先得，額滿即止",
    cta_type: "official",
    cta_label: "查看官方票務資訊",
    registration_url: url,
    booking_url: url,
    official_url: url,
    organizer_name: "AIRSIDE / Manulife 宏利",
    tags: "AIRSIDE, 宏利, Manulife, 健康活動, 親子活動, 啟德",
    highlights:
      "超過 30 位星級導師及嘉賓\n運動、心理健康、情緒健康及健康知識分享\n適合親子及家庭一起參與\n地點鄰近港鐵啟德站",
    terms:
      "活動名額有限，先到先得\n實際活動時間、導師及安排以主辦方最新公布為準\n部分活動或需另行報名或購票",
    remarks:
      "此活動資料根據 AIRSIDE 官方活動頁初步整理，收費、名額及報名詳情請以主辦方最新公布為準。",
    google_map_url: "https://www.google.com/maps/search/?api=1&query=AIRSIDE%20Kai%20Tak",
    google_map_embed_url:
      "https://maps.google.com/maps?q=AIRSIDE%20Kai%20Tak&output=embed",
    extraction_notes: [
      ...event.extraction_notes,
      "已套用 AIRSIDE Manulife Wellbeing Fest 專用 fallback rule。",
      "早鳥優惠價、原價、日期及地點已根據官方頁面內容預填，仍需商戶最後確認。",
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = String(body?.url || "").trim();

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "請提供活動網址。" },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { ok: false, error: "活動網址格式不正確，請使用完整 https:// URL。" },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { ok: false, error: "只支援 http 或 https 網址。" },
        { status: 400 }
      );
    }

    let event = emptyEvent(parsedUrl.toString());

    let html = "";
    let fetchError = "";

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "GET",
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; HKFamilyFunBot/1.0; +https://www.hkfamilyfun.com)",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "accept-language": "zh-HK,zh;q=0.9,en;q=0.8",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        fetchError = `網站回應 ${response.status}，未能完整讀取 HTML。`;
      } else {
        html = await response.text();
      }
    } catch (error) {
      fetchError =
        error instanceof Error
          ? error.message
          : "server-side fetch 失敗，可能網站封鎖自動讀取。";
    }

    if (fetchError) {
      event.extraction_notes.push(fetchError);
    }

    if (html) {
      const title = getTitle(html);
      const description = getDescription(html);
      const image = getImage(html, parsedUrl.toString());
      const pageText = cleanText(html).slice(0, 20000);

      const jsonLdItems = extractJsonLd(html);
      const jsonLdEvent = findEventJsonLd(jsonLdItems);

      event = {
        ...event,
        title_tc: title,
        short_description_tc: description.slice(0, 160),
        description_tc: description,
        cover_image_url: image,
        gallery_image_urls: image ? [image] : [],
      };

      event = applyJsonLd(event, jsonLdEvent, parsedUrl.toString());

      const dateRange = extractDateRangeFromText(pageText);
      if (!event.start_date) event.start_date = dateRange.start_date;
      if (!event.end_date) event.end_date = dateRange.end_date;

      const venue = extractVenueFromText(pageText);
      event = {
        ...event,
        venue_name: event.venue_name || venue.venue_name,
        address: event.address || venue.address,
        area: event.area || venue.area,
        district: event.district || venue.district,
        mtr_station: event.mtr_station || venue.mtr_station,
      };

      const price = extractPrices(pageText);
      if (price) {
        event = {
          ...event,
          price_display_mode: price.price_display_mode,
          price_label: price.price_label,
          min_price: price.min_price,
          max_price: price.max_price,
          offer_price: price.offer_price,
          original_price: price.original_price,
        };
      }

      event.extraction_notes.push("已完成 server-side HTML / meta / JSON-LD 初步抽取。");
    }

    event = applyAirsideFallback(event, parsedUrl.toString());

    if (!event.title_tc) {
      event.extraction_notes.push("未能抽取活動名稱，請商戶手動填寫。");
    }

    if (!event.start_date) {
      event.extraction_notes.push("未能穩定抽取活動日期，請商戶手動確認。");
    }

    if (!event.cover_image_url) {
      event.extraction_notes.push("未能抽取 og:image，請商戶手動貼圖片 URL 或稍後上載圖片。");
    }

    return NextResponse.json({
      ok: true,
      event,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "匯入活動資料時發生未知錯誤。",
      },
      { status: 500 }
    );
  }
}