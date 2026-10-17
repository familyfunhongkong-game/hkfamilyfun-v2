import Link from "next/link";
import { ArrowUpRight, MapPin, Ticket } from "lucide-react";
import ResilientEventImage from "@/components/resilient-event-image";
import type { Event } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n/config";
import { displayTodayTime } from "@/lib/events/today-schedule";

function tr(locale: AppLocale, tc: string, sc: string, en: string) {
  return locale === "en" ? en : locale === "zh-Hans" ? sc : tc;
}

/** /today intentionally has one compact link per event; detailed descriptions,
 * galleries, booking links, favorites and notes live on the event detail page.
 */
export default function TodayScheduleRow({
  event, locale,
}: {
  event: Event;
  locale: AppLocale;
}) {
  const time = displayTodayTime(event);
  const timeTbc = tr(locale, "時間待定", "时间待定", "Time TBC");
  const district = event.district?.trim() || tr(locale, "地點待確認", "地点待确认", "Location TBC");
  const price = event.price?.trim() || tr(locale, "收費待確認", "收费待确认", "Price TBC");
  const free = event.priceType === "free";
  return (
    <li className="list-none">
      <Link
        href={`/events/${event.id}`}
        aria-label={`${event.title} · ${time.start ?? timeTbc} · ${district} · ${price}`}
        className="group grid min-w-0 grid-cols-[3.9rem_5rem_minmax(0,1fr)] items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 sm:grid-cols-[6rem_8.5rem_minmax(0,1fr)_1.5rem] sm:gap-4 sm:p-3"
      >
        <div className="min-w-0 self-center text-center tabular-nums">
          {time.start ? (
            <>
              <strong className="block text-sm font-black leading-tight text-purple-800 sm:text-lg">{time.start}</strong>
              {time.end ? (
                <span className="mt-1 block text-[10px] font-bold leading-tight text-slate-500 sm:text-xs">
                  – {time.end}
                </span>
              ) : null}
            </>
          ) : (
            <span className="block break-words text-[11px] font-bold leading-4 text-slate-500 sm:text-xs">
              {timeTbc}
            </span>
          )}
        </div>

        <div className="relative h-[5.1rem] min-w-0 overflow-hidden rounded-xl bg-purple-50 ring-1 ring-slate-100 sm:h-[5.75rem]">
          <ResilientEventImage
            src={event.image}
            alt={event.title}
            compactFallback
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0 py-1">
          <h3 className="line-clamp-2 break-words text-sm font-black leading-snug text-slate-900 transition group-hover:text-purple-800 sm:text-base">
            {event.title}
          </h3>
          <div className="mt-2 flex min-w-0 items-center gap-1 text-[11px] font-medium text-slate-600 sm:text-xs">
            <MapPin className="h-3 w-3 shrink-0 text-purple-600" aria-hidden="true"/>
            <span className="truncate">{district}</span>
          </div>
          <div className="mt-1.5 flex min-w-0 items-start gap-1 text-[11px] sm:text-xs">
            <Ticket className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true"/>
            <span className={`line-clamp-2 font-extrabold leading-4 ${free ? "text-emerald-700" : "text-slate-700"}`}>
              {price}
            </span>
          </div>
        </div>
        <ArrowUpRight className="hidden h-5 w-5 text-slate-400 transition group-hover:text-purple-700 sm:block" aria-hidden="true"/>
      </Link>
    </li>
  );
}
