import Link from "next/link";
import { getPublishedEvents } from "@/lib/supabase/events";
import { getServerLocale } from "@/lib/i18n/server";
import { getPublicMessages } from "@/lib/i18n/public-messages";
import { eventOccursOn, eventOccursInRange } from "@/lib/events/recurrence";
import ResilientEventImage from "@/components/resilient-event-image";
import { getHongKongPublicHoliday, getHongKongPublicHolidayName } from "@/lib/hk-public-holidays";

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

function eventTimeSortValue(time: string) {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; day?: string }> | { month?: string; day?: string };
}) {
  const locale = await getServerLocale();
  const p = getPublicMessages(locale);
  const events = await getPublishedEvents(locale);
  const resolvedSearchParams = await Promise.resolve(searchParams || {});
  const selectedMonth = monthKey(resolvedSearchParams.month);
  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;
  const today = hkToday();
  const requestedDay = resolvedSearchParams.day;
  const selectedDay = requestedDay && /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) && requestedDay.startsWith(selectedMonth + "-") && Number(requestedDay.slice(-2)) >= 1 && Number(requestedDay.slice(-2)) <= daysInMonth ? requestedDay : (today.startsWith(selectedMonth + "-") ? today : monthStart);
  const monthHolidays = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const holiday = getHongKongPublicHoliday(date);
    return holiday
      ? {
          date,
          day,
          holiday,
          name: getHongKongPublicHolidayName(holiday, locale),
        }
      : null;
  }).filter(Boolean) as Array<{
    date: string;
    day: number;
    holiday: NonNullable<ReturnType<typeof getHongKongPublicHoliday>>;
    name: string;
  }>;

  const monthEvents = events.filter(
    (event) =>
      /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
      eventOccursInRange(
        {
          startDate: event.date,
          endDate: event.endDate,
          recurrenceType: event.recurrenceType,
          recurrenceWeekdays: event.recurrenceWeekdays,
          recurrenceIncludeDates: event.recurrenceIncludeDates,
          recurrenceExcludeDates: event.recurrenceExcludeDates,
        },
        monthStart,
        monthEnd,
      ),
  );

  const eventsByDay = new Map<number, typeof monthEvents>();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    eventsByDay.set(
      day,
      monthEvents
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
            date,
          ),
        )
        .sort((a, b) => {
          const timeDiff = eventTimeSortValue(a.time) - eventTimeSortValue(b.time);
          if (timeDiff !== 0) return timeDiff;
          return a.title.localeCompare(b.title, "zh-HK");
        }),
    );
  }

  const selectedEvents = eventsByDay.get(Number(selectedDay.slice(-2))) || [];
  const recentlyPublished = [...selectedEvents].sort((a, b) => {
    const aPost = Date.parse(a.publishedAt || a.updatedAt || "") || 0;
    const bPost = Date.parse(b.publishedAt || b.updatedAt || "") || 0;
    if (bPost !== aPost) return bPost - aPost;
    return eventTimeSortValue(a.time) - eventTimeSortValue(b.time) || a.title.localeCompare(b.title, "zh-HK");
  });
  const tr = (tc: string, sc: string, en: string) => locale === "en" ? en : locale === "zh-Hans" ? sc : tc;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link
              href={`/calendar?month=${shiftMonth(selectedMonth, -1)}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-50"
              aria-label={p.previousMonth}
            >
              ‹
            </Link>

            <div className="text-center">
              <p className="text-sm font-black text-purple-700">{p.calendarTitle}</p>
              <h1 className="mt-1 text-2xl font-black">
                {locale === "en" ? `${new Intl.DateTimeFormat("en-HK", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1))}` : `${year}年${month}月`}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {p.calendarPublishedOnly}
              </p>
            </div>

            <Link
              href={`/calendar?month=${shiftMonth(selectedMonth, 1)}`}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-50"
              aria-label={p.nextMonth}
            >
              ›
            </Link>
          </div>

          <div className="mb-5 text-center">
            <Link
              href="/calendar"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700"
            >
              {p.currentMonth}
            </Link>
          </div>

          <div className="grid grid-cols-7 border-l border-t border-slate-100 text-center text-sm">
            {(locale === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["日", "一", "二", "三", "四", "五", "六"]).map((day) => (
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
                const holiday = getHongKongPublicHoliday(date);
                const isSunday =
                  new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
                const isRedDay = Boolean(holiday) || isSunday;
                const holidayName = holiday
                  ? getHongKongPublicHolidayName(holiday, locale)
                  : "";

                return (
                  <div
                    key={day}
                    className={[
                      "min-h-[74px] border-b border-r border-slate-100 p-1 text-left hover:bg-purple-50 sm:min-h-[96px] sm:p-2",
                      isToday
                        ? "bg-blue-50"
                        : isRedDay
                          ? "bg-rose-50/50"
                          : "bg-white",
                    ].join(" ")}
                  >
                    <Link
                      href={`/calendar?month=${selectedMonth}&day=${date}#day-events`}
                      aria-label={`${date} — ${dayEvents.length} ${p.eventsUnit}`}
                      className={[
                        "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600",
                        date === selectedDay
                          ? isRedDay
                            ? "bg-blue-600 text-white ring-2 ring-rose-400"
                            : "bg-blue-600 text-white"
                          : isRedDay
                            ? "text-rose-600"
                            : "text-slate-700",
                      ].join(" ")}
                    >
                      {day}
                    </Link>

                    {holiday ? (
                      <p className="mt-1 hidden line-clamp-2 text-[10px] font-black leading-4 text-rose-600 sm:block">
                        {holidayName}
                      </p>
                    ) : null}

                    <Link
                      href={`/calendar?month=${selectedMonth}&day=${date}#day-events`}
                      aria-label={`${date}: ${dayEvents.length} ${p.eventsUnit}`}
                      className={`mt-1 inline-flex min-h-8 items-center justify-center rounded-lg px-2 text-xs font-black tabular-nums sm:text-sm ${date === selectedDay ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-800 hover:bg-purple-100"}`}
                    >
                      {dayEvents.length} {tr("項", "项", "events")}
                    </Link>
                  </div>
                );
              },
            )}
          </div>

          {monthHolidays.length ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 sm:hidden">
              <p className="text-xs font-black text-rose-700">
                {locale === "en"
                  ? "Public holidays this month"
                  : locale === "zh-Hans"
                    ? "本月公众假期"
                    : "本月公眾假期"}
              </p>
              <div className="mt-2 space-y-1.5">
                {monthHolidays.map((item) => (
                  <Link
                    key={item.date}
                    href={`/calendar?month=${selectedMonth}&day=${item.date}#day-events`}
                    className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs"
                  >
                    <span className="shrink-0 font-black text-rose-600">
                      {item.day}
                    </span>
                    <span className="font-bold text-slate-700">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-600" />
              {locale === "en"
                ? "Red date = Hong Kong public holiday / Sunday"
                : locale === "zh-Hans"
                  ? "红色日期 = 香港公众假期／星期日"
                  : "紅色日期 = 香港公眾假期／星期日"}
            </span>
            <span>{tr("點擊日期或活動數量，下方即顯示該日活動（最新發布優先）。", "点击日期或活动数量，下方显示当天活动（最新发布优先）。", "Select a date or count to view its events below, newest listings first.")}</span>
          </div>
        </div>

        <section id="day-events" className="mt-8 scroll-mt-24" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-purple-700">{tr("已選日期", "已选日期", "Selected date")}</p>
              <h2 className="mt-1 text-2xl font-black">{selectedDay} · {tr("當日活動", "当日活动", "Events")}</h2>
              <p className="mt-2 text-xs text-slate-500">{tr("最新發布排最前。點擊活動可查看完整資料及報名方式。", "最新发布排在最前。点击活动查看详情。", "Newest listings first. Open a listing for full details and booking.")}</p>
            </div>
            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-black text-purple-800">{recentlyPublished.length} {p.eventsUnit}</span>
          </div>
          {recentlyPublished.length ? (
            <ol className="mt-5 space-y-3">
              {recentlyPublished.map((event) => (
                <li key={event.id}>
                  <Link href={`/events/${event.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-purple-300 hover:shadow-md sm:gap-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-purple-50 sm:h-24 sm:w-36">
                      <ResilientEventImage src={event.image} alt={event.title} compactFallback className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-black text-slate-900 group-hover:text-purple-700 sm:text-base">{event.title}</h3>
                      <p className="mt-1 text-xs text-slate-600">{event.time || tr("時間待主辦方確認", "时间待主办方确认", "Time not confirmed")} · {event.district || tr("地區待確認", "地区待确认", "District TBC")}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{event.venue || event.organizer || ""}</p>
                    </div>
                    <span className="shrink-0 text-xs font-black text-purple-700">{tr("詳情 ›", "详情 ›", "Details ›")}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-600">
              {tr("該日暫時沒有已核實的活動，請選其他日期。", "该日暂时没有已核实的活动，请选择其他日期。", "No verified events on this day. Choose another date.")}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
