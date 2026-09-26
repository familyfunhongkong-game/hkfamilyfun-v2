import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedEvents } from "@/lib/supabase/events";

export const metadata: Metadata = {
  title: "香港親子活動日曆",
  description: "按月份及日期查看香港親子活動，計劃平日、週末及假期家庭活動。",
  alternates: {
    canonical: "/calendar",
  },
  openGraph: {
    url: "/calendar",
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

function monthKey(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return hkToday().slice(0, 7);
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function overlapsMonth(
  start: string,
  end: string | undefined,
  monthStart: string,
  monthEnd: string,
) {
  const finalEnd = end || start;
  return start <= monthEnd && finalEnd >= monthStart;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const events = await getPublishedEvents();
  const selectedMonth = monthKey(searchParams?.month);
  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;
  const today = hkToday();

  const monthEvents = events.filter(
    (event) =>
      /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
      overlapsMonth(event.date, event.endDate, monthStart, monthEnd),
  );

  const eventsByDay = new Map<number, typeof monthEvents>();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    eventsByDay.set(
      day,
      monthEvents.filter((event) => {
        const end = event.endDate || event.date;
        return event.date <= date && end >= date;
      }),
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link
              href={`/calendar?month=${shiftMonth(selectedMonth, -1)}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-50"
              aria-label="上一個月"
            >
              ‹
            </Link>

            <div className="text-center">
              <p className="text-sm font-black text-purple-700">活動日曆</p>
              <h1 className="mt-1 text-2xl font-black">
                {year}年{month}月
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                只顯示仍有效並已發布的活動
              </p>
            </div>

            <Link
              href={`/calendar?month=${shiftMonth(selectedMonth, 1)}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-50"
              aria-label="下一個月"
            >
              ›
            </Link>
          </div>

          <div className="mb-5 text-center">
            <Link
              href="/calendar"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700"
            >
              返回今個月
            </Link>
          </div>

          <div className="grid grid-cols-7 border-l border-t border-slate-100 text-center text-sm">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div
                key={day}
                className="border-b border-r border-slate-100 bg-slate-50 px-2 py-3 font-black text-slate-500"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div
                key={`blank-${index}`}
                className="min-h-[82px] border-b border-r border-slate-100 bg-slate-50/40"
              />
            ))}

            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
              (day) => {
                const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsByDay.get(day) || [];
                const isToday = date === today;

                return (
                  <Link
                    key={day}
                    href={`/events?date=${date}`}
                    className={[
                      "min-h-[82px] border-b border-r border-slate-100 p-2 text-left hover:bg-purple-50",
                      isToday ? "bg-blue-50" : "bg-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black",
                        isToday
                          ? "bg-blue-600 text-white"
                          : "text-slate-700",
                      ].join(" ")}
                    >
                      {day}
                    </span>

                    {dayEvents.length ? (
                      <div className="mt-2 space-y-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        <p className="line-clamp-2 text-[11px] font-bold leading-4 text-slate-600">
                          {dayEvents[0].title}
                        </p>
                        {dayEvents.length > 1 ? (
                          <p className="text-[10px] font-black text-purple-700">
                            +{dayEvents.length - 1}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </Link>
                );
              },
            )}
          </div>
        </div>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black text-purple-700">
                {year}年{month}月
              </p>
              <h2 className="mt-1 text-2xl font-black">已發布活動</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              {monthEvents.length} 個
            </span>
          </div>

          {monthEvents.length ? (
            <div className="mt-5 space-y-4">
              {monthEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-purple-200 md:grid-cols-[120px_1fr_auto]"
                >
                  <div className="rounded-2xl bg-orange-50 px-3 py-3 text-center text-sm font-black text-orange-700">
                    {event.date}
                    {event.endDate && event.endDate !== event.date
                      ? ` → ${event.endDate}`
                      : ""}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {event.organizer} · {event.district}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {event.time}
                    </p>
                  </div>
                  <span className="self-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {event.price || "詳情請見官方網站"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-black text-slate-800">
                暫未有這個月的已發布活動
              </p>
              <p className="mt-2 text-sm text-slate-500">
                新活動經平台審批後會自動出現在日曆。
              </p>
              <Link
                href="/events"
                className="mt-5 inline-flex rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white"
              >
                查看全部活動
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
