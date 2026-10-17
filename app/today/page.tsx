import Link from "next/link";
import { CalendarDays, Clock3, Moon, Sun, Sunset } from "lucide-react";
import { getPublishedEvents } from "@/lib/supabase/events";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicMessages } from "@/lib/i18n/public-messages";
import { eventOccursOn } from "@/lib/events/recurrence";
import { groupTodaySchedule, TODAY_PERIODS, type TodayPeriod } from "@/lib/events/today-schedule";
import TodayScheduleRow from "@/components/events/TodayScheduleRow";
import type { AppLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

function hkToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const periods: Record<TodayPeriod, {
  tc: string; sc: string; en: string; hours: string;
  tone: string; Icon: typeof Sun;
}> = {
  morning: {
    tc: "上午", sc: "上午", en: "Morning", hours: "00:00–11:59",
    tone: "text-amber-700 bg-amber-50 border-amber-200", Icon: Sun,
  },
  afternoon: {
    tc: "下午", sc: "下午", en: "Afternoon", hours: "12:00–17:59",
    tone: "text-sky-700 bg-sky-50 border-sky-200", Icon: Sunset,
  },
  evening: {
    tc: "晚上", sc: "晚上", en: "Evening", hours: "18:00–23:59",
    tone: "text-violet-700 bg-violet-50 border-violet-200", Icon: Moon,
  },
  unscheduled: {
    tc: "時間待確認", sc: "时间待确认", en: "Time to be confirmed", hours: "",
    tone: "text-slate-700 bg-slate-100 border-slate-200", Icon: Clock3,
  },
};

function translated(locale: AppLocale, tc: string, sc: string, en: string) {
  return locale === "en" ? en : locale === "zh-Hans" ? sc : tc;
}

export default async function TodayPage() {
  const locale = await getServerLocale();
  const p = getPublicMessages(locale);
  const today = hkToday();
  const events = await getPublishedEvents(locale);
  // Recurrences must be evaluated against Hong Kong's calendar day, not
  // the visitor's timezone. Never include activities from another day.
  const todayEvents = events.filter((event) =>
    eventOccursOn(
      {
        startDate: event.date,
        endDate: event.endDate,
        recurrenceType: event.recurrenceType,
        recurrenceWeekdays: event.recurrenceWeekdays,
        recurrenceIncludeDates: event.recurrenceIncludeDates,
        recurrenceExcludeDates: event.recurrenceExcludeDates,
      },
      today,
    ),
  );
  const schedule = groupTodaySchedule(todayEvents);
  const activePeriods = TODAY_PERIODS.filter(period => schedule[period].length > 0);

  const displayDate = new Intl.DateTimeFormat(
    locale === "en" ? "en-HK" : locale === "zh-Hans" ? "zh-CN" : "zh-HK",
    { timeZone: "Asia/Hong_Kong", year: "numeric", month: "long", day: "numeric", weekday: "long" },
  ).format(new Date(`${today}T12:00:00+08:00`));

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 sm:pb-10">
      <section className="border-b border-purple-100 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-blue-700 text-white">
        <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-9">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black tracking-wide text-white/85">{p.todayKicker} · Hong Kong</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{p.todayTitle}</h1>
              <p className="mt-2 text-sm font-medium text-white/90">{displayDate}</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-center">
              <p className="text-2xl font-black tabular-nums sm:text-3xl">{todayEvents.length}</p>
              <p className="text-[11px] font-semibold text-white/90">{p.todayCount}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-xs leading-5 text-white/90 sm:text-sm">
            {translated(locale,
              "由早到晚按活動開始時間排序，揀啱時間再按活動查看詳情及報名。",
              "由早到晚按活动开始时间排序，选好时间再点击查看详情及报名。",
              "Plan your day in start-time order. Tap any event for full details and booking.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6 sm:py-8">
        {activePeriods.length ? (
          <>
            <nav aria-label={translated(locale, "跳到時段", "跳转到时段", "Jump to time slot")} className="flex flex-wrap gap-2">
              {activePeriods.map(period => {
                const info = periods[period];
                return (
                  <a key={period} href={`#today-${period}`}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-purple-300 hover:text-purple-800">
                    {translated(locale, info.tc, info.sc, info.en)}
                    <span className="ml-1.5 text-purple-700 tabular-nums">{schedule[period].length}</span>
                  </a>
                );
              })}
            </nav>

            <div className="space-y-7">
              {activePeriods.map(period => {
                const info = periods[period];
                const Icon = info.Icon;
                return (
                  <section key={period} id={`today-${period}`} aria-labelledby={`today-${period}-heading`} className="scroll-mt-24">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h2 id={`today-${period}-heading`} className="flex items-center gap-2.5 text-base font-black text-slate-900 sm:text-lg">
                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${info.tone}`}>
                          <Icon className="h-4 w-4" aria-hidden="true"/>
                        </span>
                        {translated(locale, info.tc, info.sc, info.en)}
                        {info.hours && <span className="text-xs font-medium tabular-nums text-slate-500">{info.hours}</span>}
                      </h2>
                      <span className="text-xs font-bold text-slate-500">
                        {schedule[period].length} {p.eventsUnit}
                      </span>
                    </div>
                    <ul className="space-y-2.5">
                      {schedule[period].map(event => (
                        <TodayScheduleRow key={event.id} event={event} locale={locale}/>
                      ))}
                    </ul>
                    {period === "unscheduled" && (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {translated(locale,
                          "主辦方未提供可靠開始時間；請先打開詳情確認，無法按時段安排。",
                          "主办方未提供可靠开始时间；请先打开详情确认，无法按时段安排。",
                          "The organizer has not confirmed a reliable start time. Check details before planning.",
                        )}
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              {translated(locale,
                "時間及收費以主辦單位最新公布為準；只列出今日仍有效的已發布活動。",
                "时间和收费以主办单位最新公布为准；仅显示今天仍有效的已发布活动。",
                "Times and fees are subject to the organizer's latest information. Only today's published events are shown.",
              )}
            </p>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-black">{p.noToday}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{p.noTodayDesc}</p>
            <Link href="/events" className="mt-5 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white">
              {p.otherDates}
            </Link>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-black sm:text-lg">
            <CalendarDays className="h-5 w-5 text-purple-700" aria-hidden="true"/>
            {p.moreEvents}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{p.moreEventsDesc}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/calendar" className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold hover:border-purple-300 hover:text-purple-700">
              {p.calendarTitle}
            </Link>
            <Link href="/events/map" className="rounded-full bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700">
              {p.locationExplore}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
