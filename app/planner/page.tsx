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

type BusyPeriod = {
  start: string;
  end: string;
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

function eventInterval(event: EventRecord, selectedDate: string) {
  const startText = safeText(event.start_time, "12:00").slice(0, 5);
  const endText = safeText(event.end_time).slice(0, 5);

  const start = Date.parse(selectedDate + "T" + startText + ":00+08:00");
  const end = endText
    ? Date.parse(selectedDate + "T" + endText + ":00+08:00")
    : start + 90 * 60 * 1000;

  return { start, end };
}

function overlapsBusy(
  event: EventRecord,
  selectedDate: string,
  busy: BusyPeriod[],
) {
  const interval = eventInterval(event, selectedDate);

  return busy.some((item) => {
    const busyStart = Date.parse(item.start);
    const busyEnd = Date.parse(item.end);

    return (
      Number.isFinite(busyStart) &&
      Number.isFinite(busyEnd) &&
      interval.start < busyEnd &&
      interval.end > busyStart
    );
  });
}

export default function PlannerPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(hkToday());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [calendarConfigured, setCalendarConfigured] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [busyPeriods, setBusyPeriods] = useState<BusyPeriod[]>([]);

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

  useEffect(() => {
    async function loadCalendarStatus() {
      try {
        const response = await fetch("/api/google-calendar/status", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          configured?: boolean;
          connected?: boolean;
        };

        setCalendarConfigured(Boolean(data.configured));
        setCalendarConnected(Boolean(data.connected));
      } finally {
        setCalendarLoading(false);
      }
    }

    void loadCalendarStatus();
  }, []);

  useEffect(() => {
    async function loadBusy() {
      if (!calendarConnected) {
        setBusyPeriods([]);
        return;
      }

      try {
        const response = await fetch(
          "/api/google-calendar/freebusy?date=" + encodeURIComponent(date),
          { cache: "no-store" },
        );

        if (!response.ok) {
          if (response.status === 401) setCalendarConnected(false);
          setBusyPeriods([]);
          return;
        }

        const data = (await response.json()) as {
          busy?: BusyPeriod[];
        };

        setBusyPeriods(Array.isArray(data.busy) ? data.busy : []);
      } catch {
        setBusyPeriods([]);
      }
    }

    void loadBusy();
  }, [calendarConnected, date]);

  const suggestions = useMemo(() => {
    const candidates = events
      .filter((event) => occursOn(event, date))
      .filter(
        (event) =>
          !calendarConnected ||
          !overlapsBusy(event, date, busyPeriods),
      )
      .map((event) => ({
        event,
        score: scoreEvent(event, query),
      }))
      .filter((item) => !query.trim() || item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          minutes(a.event.start_time) - minutes(b.event.start_time),
      );

    const selected: EventRecord[] = [];

    for (const item of candidates) {
      const event = item.event;
      const interval = eventInterval(event, date);

      const clashes = selected.some((chosen) => {
        const chosenInterval = eventInterval(chosen, date);
        return (
          interval.start < chosenInterval.end &&
          interval.end > chosenInterval.start
        );
      });

      if (!clashes) selected.push(event);
      if (selected.length >= 3) break;
    }

    return selected;
  }, [busyPeriods, calendarConnected, date, events, query]);

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

  async function disconnectCalendar() {
    await fetch("/api/google-calendar/disconnect", {
      method: "POST",
    });
    setCalendarConnected(false);
    setBusyPeriods([]);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-violet-700 via-purple-700 to-blue-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-white/80">智能行程助手 Beta</p>
          <h1 className="mt-2 text-4xl font-black">
            講你想去邊、想做咩，幫你砌親子行程
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85">
            以 HK Family Fun 已發布活動配搭行程，日期一律按香港時間。可按活動時間、
            地區、免費／SEN 等條件配對，並避開活動互相撞時間。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto]">
            <label>
              <span className="text-xs font-black text-slate-600">
                想去邊日？（香港日期）
              </span>
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

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-blue-950">Google Calendar 空檔</p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                {calendarLoading
                  ? "正在檢查連接狀態…"
                  : calendarConnected
                    ? "已連接，只讀 Free/Busy 時段；建議會避開你已有行程。"
                    : calendarConfigured
                      ? "可連接 Google Calendar，系統只會讀取 Free/Busy（忙碌／空閒）時段，不讀取行程標題或內容。"
                      : "OAuth 尚未完成設定；現時仍可使用免費智能配對及一鍵加入 Calendar。"}
              </p>
            </div>

            {calendarConnected ? (
              <button
                type="button"
                onClick={disconnectCalendar}
                className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-800"
              >
                解除連接
              </button>
            ) : calendarConfigured ? (
              <a
                href="/api/google-calendar/connect"
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white"
              >
                連接 Google Calendar
              </a>
            ) : (
              <span className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-black text-slate-600">
                等待 OAuth 設定
              </span>
            )}
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
            {calendarConnected && busyPeriods.length ? (
              <p className="mt-1 text-xs font-bold text-blue-700">
                已避開 Google Calendar {busyPeriods.length} 段忙碌時間
              </p>
            ) : null}
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
                <h3 className="text-xl font-black">
                  {safeText(event.title_tc, "未命名活動")}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {safeText(event.venue_name, "場地待定")} ·{" "}
                  {safeText(event.district, "地區待定")}
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

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
          <p className="font-black">私隱設計</p>
          <p className="mt-1">
            「附近我」的位置只在瀏覽器用作距離排序；Google Calendar 連接只讀 Free/Busy，
            不需要把你的行程標題、描述或參加者內容傳給 HK Family Fun。
          </p>
        </div>
      </section>
    </main>
  );
}
