import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedEvents } from "@/lib/supabase/events";

export const metadata: Metadata = {
  title: "今日香港親子活動",
  description: "查看今日仍然有效並已發布的香港親子活動、免費活動及家庭好去處。",
  alternates: {
    canonical: "/today",
  },
  openGraph: {
    url: "/today",
  },
};

export const dynamic = "force-dynamic";

function hkToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function occursOn(eventDate: string, endDate: string | undefined, target: string) {
  const end = endDate || eventDate;
  return eventDate <= target && end >= target;
}

export default async function TodayPage() {
  const today = hkToday();
  const events = await getPublishedEvents();
  const todayEvents = events
    .filter((event) => occursOn(event.date, event.endDate, today))
    .sort((a, b) => a.time.localeCompare(b.time));

  const displayDate = new Intl.DateTimeFormat("zh-HK", {
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
              <p className="text-sm font-black text-white/80">今日活動</p>
              <h1 className="mt-2 text-4xl font-black">今日活動時間表</h1>
              <p className="mt-3 text-sm leading-7 text-white/85">
                {displayDate} · 只顯示仍有效並已發布的活動。
              </p>
            </div>

            <div className="rounded-3xl bg-white/15 px-6 py-5 text-center backdrop-blur">
              <p className="text-4xl font-black">{todayEvents.length}</p>
              <p className="mt-1 text-sm font-bold text-white/85">今日活動</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {todayEvents.length ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {todayEvents.map((event) => (
              <article
                key={event.id}
                className="grid gap-4 border-b border-slate-100 p-5 last:border-b-0 md:grid-cols-[110px_1fr_auto]"
              >
                <div className="text-sm font-black text-slate-500">
                  {event.time}
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {event.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {event.organizer} · {event.district}
                  </p>

                  {event.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {event.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                    {event.price || "詳情請見官方網站"}
                  </span>
                  <Link
                    href={`/events/${event.id}`}
                    className="rounded-full bg-purple-700 px-4 py-2 text-sm font-black text-white hover:bg-purple-800"
                  >
                    查看
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-black">今日暫未有已發布活動</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              我們不會用示範活動填滿頁面；新活動完成審批後會自動顯示。
            </p>
            <Link
              href="/events"
              className="mt-5 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
            >
              查看其他日期活動
            </Link>
          </div>
        )}

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">想睇更多活動？</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            你可以到活動日曆、搜尋活動或地點探索，按日期、地區及港鐵站篩選。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/calendar"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-purple-300 hover:text-purple-700"
            >
              活動日曆
            </Link>
            <Link
              href="/events/map"
              className="rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white hover:bg-teal-700"
            >
              地點探索
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
