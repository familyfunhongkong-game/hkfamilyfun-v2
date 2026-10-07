import Link from "next/link";
import { getPublishedEvents } from "@/lib/supabase/events";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicMessages } from "@/lib/i18n/public-messages";
import { eventOccursOn } from "@/lib/events/recurrence";
import PublicEventCard from "@/components/events/PublicEventCard";

export const dynamic = "force-dynamic";

function hkToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}


export default async function TodayPage() {
  const locale = await getServerLocale();
  const p = getPublicMessages(locale);
  const today = hkToday();
  const events = await getPublishedEvents(locale);
  const todayEvents = events
    .filter((event) =>
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
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  const displayDate = new Intl.DateTimeFormat(locale === "en" ? "en-HK" : locale === "zh-Hans" ? "zh-CN" : "zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${today}T12:00:00+08:00`));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-blue-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-white/80">{p.todayKicker}</p>
              <h1 className="mt-2 text-4xl font-black">{p.todayTitle}</h1>
              <p className="mt-3 text-sm leading-7 text-white/85">
                {displayDate} · {p.todayPublishedOnly}
              </p>
            </div>

            <div className="rounded-3xl bg-white/15 px-6 py-5 text-center backdrop-blur">
              <p className="text-4xl font-black">{todayEvents.length}</p>
              <p className="mt-1 text-sm font-bold text-white/85">{p.todayKicker}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {todayEvents.length ? (
          <div className="grid items-stretch gap-6 md:grid-cols-2">
            {todayEvents.map((event) => (
              <PublicEventCard
                key={event.id}
                event={event}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black">{p.noToday}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {p.noTodayDesc}
            </p>
            <Link
              href="/events"
              className="mt-5 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
            >
              {p.otherDates}
            </Link>
          </div>
        )}

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">{p.moreEvents}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {p.moreEventsDesc}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/calendar"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
            >
              {p.calendarTitle}
            </Link>
            <Link
              href="/events/map"
              className="rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white hover:bg-teal-700"
            >
              {p.locationExplore}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
