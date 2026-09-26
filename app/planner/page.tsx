"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type EventRecord = {
  id: string;
  title_tc?: string | null;
  short_description_tc?: string | null;
  organizer_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  price_label?: string | null;
  price_display_mode?: string | null;
  is_free?: boolean | null;
  is_sen_friendly?: boolean | null;
  tags?: unknown;
};

function safeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function hkToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function occursOn(event: EventRecord, target: string) {
  const start = safeText(event.start_date);
  const end = safeText(event.end_date || event.start_date);
  return Boolean(start && end && start <= target && target <= end);
}

function minutes(value?: string | null) {
  const text = safeText(value);
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 12 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/[,\n，、]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function eventSearchText(event: EventRecord) {
  return [
    event.title_tc,
    event.short_description_tc,
    event.organizer_name,
    event.venue_name,
    event.district,
    event.mtr_station,
    event.price_label,
    ...normalizeTags(event.tags),
  ]
    .map((item) => safeText(item).toLowerCase())
    .join(" ");
}

function queryWords(query: string) {
  return query
    .toLowerCase()
    .split(/[\s,，。！？、]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function scoreEvent(event: EventRecord, query: string) {
  const text = eventSearchText(event);
  const words = queryWords(query);
  let score = 0;

  words.forEach((word) => {
    if (text.includes(word)) score += 4;
  });

  if (/免費|free/.test(query.toLowerCase())) {
    if (
      event.is_free ||
      safeText(event.price_display_mode).toLowerCase() === "free" ||
      safeText(event.price_label).includes("免費")
    ) score += 8;
    else score -= 8;
  }

  if (/sen|特殊學習|特殊需要/i.test(query)) {
    score += event.is_sen_friendly ? 8 : -4;
  }

  const districtWords = [
    "中西區","灣仔區","東區","南區","油尖旺區","深水埗區","九龍城區",
    "黃大仙區","觀塘區","荃灣區","屯門區","元朗區","北區","大埔區",
    "西貢區","沙田區","葵青區","離島區",
  ];

  districtWords.forEach((district) => {
    if (query.includes(district)) {
      score += safeText(event.district) === district ? 10 : -5;
    }
  });

  return score;
}

function googleCalendarUrl(event: EventRecord) {
  const date = safeText(event.start_date);
  if (!date) return "#";

  const startTime = safeText(event.start_time, "10:00").slice(0, 5);
  const endTime = safeText(event.end_time, startTime).slice(0, 5);

  const compactDate = date.replace(/-/g, "");
  const start = compactDate + "T" + startTime.replace(":", "") + "00";
  const end = compactDate + "T" + endTime.replace(":", "") + "00";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: safeText(event.title_tc, "HK Family Fun 活動"),
    dates: start + "/" + end,
    ctz: "Asia/Hong_Kong",
    location: safeText(event.venue_name),
    details: "由 HK Family Fun 行程助手加入。請出發前再次向主辦方確認活動資料。",
  });

  return "https://calendar.google.com/calendar/render?" + params.toString();
}

export default function PlannerPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(hkToday());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setMessage("網站暫時未能連接活動資料庫。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_events")
        .select(
          "id,title_tc,short_description_tc,organizer_name,start_date,end_date,start_time,end_time,venue_name,district,mtr_station,price_label,price_display_mode,is_free,is_sen_friendly,tags",
        )
        .eq("status", "published")
        .order("start_time", { ascending: true });

      if (error) setMessage(error.message || "讀取活動失敗。");
      else setEvents((data || []) as EventRecord[]);

      setLoading(false);
    }

    void load();
  }, []);

  const suggestions = useMemo(() => {
    const candidates = events
      .filter((event) => occursOn(event, date))
      .map((event) => ({
        event,
        score: scoreEvent(event, query),
      }))
      .filter((item) => !query.trim() || item.score > 0)
      .sort((a, b) => b.score - a.score || minutes(a.event.start_time) - minutes(b.event.start_time));

    const selected: EventRecord[] = [];

    for (const item of candidates) {
      const event = item.event;
      const start = minutes(event.start_time);
      const end = minutes(event.end_time || event.start_time) + (event.end_time ? 0 : 90);

      const clashes = selected.some((chosen) => {
        const chosenStart = minutes(chosen.start_time);
        const chosenEnd =
          minutes(chosen.end_time || chosen.start_time) + (chosen.end_time ? 0 : 90);
        return start < chosenEnd && end > chosenStart;
      });

      if (!clashes) selected.push(event);
      if (selected.length >= 3) break;
    }

    return selected;
  }, [date, events, query]);

  function startVoice() {
    setMessage("");

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMessage("此瀏覽器未支援語音輸入。你仍可直接輸入想去邊、想做咩。");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "zh-HK";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) setQuery(transcript);
    };
    recognition.onerror = () => {
      setMessage("語音輸入未成功，請再試或改用文字輸入。");
    };
    recognition.start();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-violet-700 via-purple-700 to-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">智能行程助手 Beta</p>
          <h1 className="mt-2 text-4xl font-black">講你想去邊、想做咩，幫你砌親子行程</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85">
            以 HK Family Fun 已發布活動配搭行程，日期一律按香港時間。現階段免費版會按活動時間、
            地區、免費／SEN 等條件配對並避開明顯撞時間。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto]">
            <label>
              <span className="text-xs font-black text-slate-600">想去邊日？（香港日期）</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="text-xs font-black text-slate-600">你想點玩？</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例如：想去尖沙咀，免費、室內，小朋友鍾意畫畫"
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>

            <button
              type="button"
              onClick={startVoice}
              className="self-end rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white"
            >
              🎤 用廣東話講
            </button>
          </div>

          {message ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {message}
            </p>
          ) : null}
        </div>

        <div className="mt-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">{date}</p>
            <h2 className="mt-1 text-2xl font-black">建議行程</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
            {loading ? "讀取中" : suggestions.length + " 個活動"}
          </span>
        </div>

        {!loading && suggestions.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h3 className="text-xl font-black">暫未搵到完全符合嘅活動</h3>
            <p className="mt-2 text-sm text-slate-500">
              試下減少條件，例如只輸入「免費」、「尖沙咀」或「畫畫」。
            </p>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {suggestions.map((event, index) => (
            <article
              key={event.id}
              className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[90px_1fr_auto]"
            >
              <div className="rounded-2xl bg-purple-50 px-3 py-4 text-center">
                <p className="text-xs font-black text-purple-600">第 {index + 1} 站</p>
                <p className="mt-2 text-lg font-black text-purple-950">
                  {safeText(event.start_time, "時間待定").slice(0, 5)}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black">{safeText(event.title_tc, "未命名活動")}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {safeText(event.venue_name, "場地待定")} · {safeText(event.district, "地區待定")}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {safeText(event.short_description_tc, "請查看活動詳情")}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:min-w-[170px]">
                <Link
                  href={"/events/" + event.id}
                  className="rounded-xl bg-purple-700 px-4 py-2 text-center text-sm font-black text-white"
                >
                  活動詳情
                </Link>
                <a
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-black text-slate-700"
                >
                  加入 Google Calendar
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-900">
          <p className="font-black">Google Calendar 進一步整合</p>
          <p className="mt-1">
            現時已可一鍵加入 Google Calendar。要做到「先讀你現有日曆空檔，再自動避開接送／飯局／工作」，
            網站需要 Google OAuth Client ID / Client Secret。這個 API 本身可以低成本甚至免費使用，但必須先由
            HK Family Fun 自己的 Google Cloud project 授權，不能用其他人的登入憑證代替。
          </p>
        </div>
      </section>
    </main>
  );
}
