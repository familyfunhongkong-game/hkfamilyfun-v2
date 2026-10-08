"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getClientLocale } from "@/lib/i18n/client";
import { localizedText, type AppLocale } from "@/lib/i18n/config";
import { getExtraPublicMessages } from "@/lib/i18n/public-extra-messages";
import { supabase } from "@/lib/supabase/client";
import ResilientEventImage from "@/components/resilient-event-image";
import { formatEventAge } from "@/lib/events/age-display";

type EventRecord = {
  id: string;
  title_tc?: string | null;
  title_sc?: string | null;
  title_en?: string | null;
  short_description_tc?: string | null;
  short_description_sc?: string | null;
  short_description_en?: string | null;
  organizer_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  recurrence_type?: string | null;
  recurrence_weekdays?: number[] | null;
  recurrence_include_dates?: string[] | null;
  recurrence_exclude_dates?: string[] | null;
  recurrence_note?: string | null;
  venue_name?: string | null;
  venue_name_sc?: string | null;
  venue_name_en?: string | null;
  district?: string | null;
  mtr_station?: string | null;
  price_label?: string | null;
  price_display_mode?: string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  age_group?: string | null;
  age_groups?: unknown;
  age_min?: number | null;
  age_max?: number | null;
  activity_category?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
  is_free?: boolean | null;
  is_sen_friendly?: boolean | null;
  is_indoor?: boolean | null;
  tags?: unknown;
};

type SpeechRecognitionResultLike = {
  [index: number]: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  results?: {
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechEnabledWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
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

function dateWeekday(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return -1;

  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  ).getUTCDay();
}

function occursOn(event: EventRecord, target: string) {
  const start = safeText(event.start_date);
  const end = safeText(event.end_date || event.start_date);

  if (!start || !end || target < start || target > end) return false;

  if (safeText(event.recurrence_type, "none").toLowerCase() !== "weekly") {
    return true;
  }

  const includes = Array.isArray(event.recurrence_include_dates)
    ? event.recurrence_include_dates.map(String)
    : [];
  const excludes = Array.isArray(event.recurrence_exclude_dates)
    ? event.recurrence_exclude_dates.map(String)
    : [];

  if (includes.includes(target)) return true;
  if (excludes.includes(target)) return false;

  const weekdays = Array.isArray(event.recurrence_weekdays)
    ? event.recurrence_weekdays.map(Number)
    : [];

  return weekdays.includes(dateWeekday(target));
}

function minutes(value?: string | null) {
  const text = safeText(value);
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 12 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((x) => x.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n，、]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

function eventSearchText(event: EventRecord) {
  return [
    event.title_tc,
    event.title_sc,
    event.title_en,
    event.short_description_tc,
    event.short_description_sc,
    event.short_description_en,
    event.organizer_name,
    event.venue_name,
    event.venue_name_sc,
    event.venue_name_en,
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

  if (/免費|免费|free/i.test(query)) {
    if (
      event.is_free ||
      safeText(event.price_display_mode).toLowerCase() === "free" ||
      /免費|免费|free/i.test(safeText(event.price_label))
    ) {
      score += 8;
    } else {
      score -= 8;
    }
  }

  if (/sen|特殊學習|特殊学习|特殊需要/i.test(query)) {
    score += event.is_sen_friendly ? 8 : -4;
  }

  const districtWords = [
    "中西區",
    "灣仔區",
    "東區",
    "南區",
    "油尖旺區",
    "深水埗區",
    "九龍城區",
    "黃大仙區",
    "觀塘區",
    "荃灣區",
    "屯門區",
    "元朗區",
    "北區",
    "大埔區",
    "西貢區",
    "沙田區",
    "葵青區",
    "離島區",
  ];

  districtWords.forEach((district) => {
    if (query.includes(district)) {
      score += safeText(event.district) === district ? 10 : -5;
    }
  });

  return score;
}

function googleCalendarUrl(
  event: EventRecord,
  locale: AppLocale,
  fallbackTitle: string,
  note: string,
) {
  const date = safeText(event.start_date);
  if (!date) return "#";

  const startTime = safeText(event.start_time, "10:00").slice(0, 5);
  const endTime = safeText(event.end_time, startTime).slice(0, 5);

  const compactDate = date.replace(/-/g, "");
  const start = compactDate + "T" + startTime.replace(":", "") + "00";
  const end = compactDate + "T" + endTime.replace(":", "") + "00";

  const title = localizedText(locale, {
    tc: event.title_tc,
    sc: event.title_sc,
    en: event.title_en,
    fallback: fallbackTitle,
  });

  const venue = localizedText(locale, {
    tc: event.venue_name,
    sc: event.venue_name_sc,
    en: event.venue_name_en,
  });

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: start + "/" + end,
    ctz: "Asia/Hong_Kong",
    location: venue,
    details: note,
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
  const [locale, setLocale] = useState<AppLocale>("zh-Hant");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(hkToday());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [calendarConfigured, setCalendarConfigured] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [busyPeriods, setBusyPeriods] = useState<BusyPeriod[]>([]);

  const m = getExtraPublicMessages(locale).planner;

  useEffect(() => {
    const activeLocale = getClientLocale();
    const activeMessages = getExtraPublicMessages(activeLocale).planner;
    setLocale(activeLocale);

    async function load() {
      if (!supabase) {
        setMessage(activeMessages.dbUnavailable);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("public_events_i18n")
        .select(
          "id,title_tc,title_sc,title_en,short_description_tc,short_description_sc,short_description_en,organizer_name,start_date,end_date,start_time,end_time,recurrence_type,recurrence_weekdays,recurrence_include_dates,recurrence_exclude_dates,recurrence_note,venue_name,venue_name_sc,venue_name_en,district,mtr_station,price_label,price_display_mode,min_price,max_price,age_group,age_groups,age_min,age_max,activity_category,category,cover_image_url,is_free,is_sen_friendly,is_indoor,tags",
        )
        .eq("status", "published")
        .order("start_time", { ascending: true });

      if (error) setMessage(error.message || activeMessages.loadFailed);
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
      } catch {
        setCalendarConfigured(false);
        setCalendarConnected(false);
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
          !calendarConnected || !overlapsBusy(event, date, busyPeriods),
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

    const speechWindow = window as SpeechEnabledWindow;
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMessage(m.voiceUnsupported);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang =
      locale === "en" ? "en-HK" : locale === "zh-Hans" ? "zh-CN" : "zh-HK";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) setQuery(transcript);
    };
    recognition.onerror = () => {
      setMessage(m.voiceFailed);
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
          <p className="text-sm font-black text-white/80">{m.kicker}</p>
          <h1 className="mt-2 text-4xl font-black">{m.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85">
            {m.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto]">
            <label>
              <span className="text-xs font-black text-slate-600">
                {m.dateLabel}
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="text-xs font-black text-slate-600">
                {m.playLabel}
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={m.placeholder}
                className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>

            <button
              type="button"
              onClick={startVoice}
              className="self-end rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800"
            >
              🎤 {m.voice}
            </button>
          </div>

          {calendarConfigured || calendarConnected ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-blue-950">
                  {m.calendarTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-800">
                  {calendarConnected
                    ? m.calendarConnected
                    : m.calendarAvailable}
                </p>
              </div>

              {calendarConnected ? (
                <button
                  type="button"
                  onClick={disconnectCalendar}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-800"
                >
                  {m.disconnect}
                </button>
              ) : (
                <a
                  href="/api/google-calendar/connect"
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white"
                >
                  {m.connect}
                </a>
              )}
            </div>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {message}
            </p>
          ) : null}
        </div>

        <div className="mt-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-purple-700">{date}</p>
            <h2 className="mt-1 text-2xl font-black">{m.suggestions}</h2>
            {calendarConnected && busyPeriods.length ? (
              <p className="mt-1 text-xs font-bold text-blue-700">
                {m.avoidedBusy(busyPeriods.length)}
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
            {loading ? m.loading : m.eventCount(suggestions.length)}
          </span>
        </div>

        {!loading && suggestions.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h3 className="text-xl font-black">{m.emptyTitle}</h3>
            <p className="mt-2 text-sm text-slate-500">{m.emptyDesc}</p>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {suggestions.map((event, index) => {
            const title = localizedText(locale, {
              tc: event.title_tc,
              sc: event.title_sc,
              en: event.title_en,
              fallback: m.untitled,
            });
            const venue = localizedText(locale, {
              tc: event.venue_name,
              sc: event.venue_name_sc,
              en: event.venue_name_en,
              fallback: m.venueTbc,
            });
            const description = localizedText(locale, {
              tc: event.short_description_tc,
              sc: event.short_description_sc,
              en: event.short_description_en,
              fallback: m.detailTbc,
            });
            const eventPrice = event.is_free ||
              safeText(event.price_display_mode).toLowerCase() === "free"
              ? locale === "en" ? "Free" : locale === "zh-Hans" ? "免费" : "免費"
              : safeText(
                  event.price_label,
                  Number(event.min_price) > 0
                    ? `HK$${Number(event.min_price)}`
                    : locale === "en"
                      ? "See price"
                      : locale === "zh-Hans"
                        ? "价格见详情"
                        : "價錢見詳情",
                );
            const age = safeText(
              event.age_group,
              formatEventAge(
                {
                  ageGroups: event.age_groups,
                  ageMin: event.age_min,
                  ageMax: event.age_max,
                },
                locale,
              ),
            );
            const category = safeText(
              event.activity_category || event.category,
              locale === "en" ? "Family Activity" : locale === "zh-Hans" ? "亲子活动" : "親子活動",
            );

            return (
              <article
                key={event.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-purple-200 hover:shadow-md"
              >
                <div className="grid gap-4 p-4 md:grid-cols-[128px_minmax(0,1fr)_auto]">
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-purple-50">
                    <ResilientEventImage
                      src={event.cover_image_url}
                      alt={title}
                      loading="lazy"
                      compactFallback
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-purple-700 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                      {m.stop(index + 1)}
                    </span>
                    <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur">
                      {safeText(event.start_time, m.timeTbc).slice(0, 5)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-700">
                        {category}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        event.is_free || safeText(event.price_display_mode).toLowerCase() === "free"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}>
                        {eventPrice}
                      </span>
                      {event.is_sen_friendly ? (
                        <span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-black text-fuchsia-700">
                          SEN 友善
                        </span>
                      ) : null}
                      {event.is_indoor ? (
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700">
                          {locale === "en" ? "Indoor" : locale === "zh-Hans" ? "室内" : "室內"}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-xl font-black text-slate-950">{title}</h3>
                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-600">
                      📍 {venue} · {event.district || m.districtTbc}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {event.mtr_station ? `🚇 ${event.mtr_station} · ` : ""}{age}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                      {locale === "en" ? "Organizer" : locale === "zh-Hans" ? "主办" : "主辦"}：
                      {safeText(
                        event.organizer_name,
                        locale === "en" ? "TBC" : locale === "zh-Hans" ? "待定" : "待定",
                      )}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{description}</p>
                  </div>

                  <div className="flex flex-col gap-2 md:min-w-[170px]">
                  <Link
                    href={"/events/" + event.id}
                    className="rounded-xl bg-purple-700 px-4 py-2 text-center text-sm font-black text-white"
                  >
                    {m.details}
                  </Link>
                  <a
                    href={googleCalendarUrl(
                      event,
                      locale,
                      m.calendarEvent,
                      m.calendarNote,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-black text-slate-700"
                  >
                    {m.addCalendar}
                  </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
          <p className="font-black">{m.privacyTitle}</p>
          <p className="mt-1">{m.privacy}</p>
        </div>
      </section>
    </main>
  );
}
