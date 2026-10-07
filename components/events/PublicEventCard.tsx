import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Baby,
  Building2,
  CalendarDays,
  Clock3,
  MapPin,
  TrainFront,
} from "lucide-react";
import type { Event } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n/config";
import ResilientEventImage from "@/components/resilient-event-image";

type PublicEventCardProps = {
  event: Event;
  locale: AppLocale;
  featured?: boolean;
  compact?: boolean;
  className?: string;
};

function text(
  locale: AppLocale,
  zhHant: string,
  zhHans: string,
  en: string,
) {
  if (locale === "en") return en;
  if (locale === "zh-Hans") return zhHans;
  return zhHant;
}

function parseCalendarDate(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCardDate(event: Event, locale: AppLocale) {
  const start = parseCalendarDate(event.date);
  const end = parseCalendarDate(event.endDate);

  if (!start) return text(locale, "日期待定", "日期待定", "Date TBC");

  const formatter = new Intl.DateTimeFormat(
    locale === "en" ? "en-HK" : locale === "zh-Hans" ? "zh-CN" : "zh-HK",
    { month: "short", day: "numeric", weekday: "short" },
  );

  const startText = formatter.format(start);
  if (!end || event.endDate === event.date) return startText;

  return `${startText} – ${formatter.format(end)}`;
}

function isPlaceholder(value: string | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;

  return [
    "tbc",
    "待定",
    "mtr tbc",
    "港鐵站待定",
    "港铁站待定",
    "organizer tbc",
    "主辦單位待定",
    "主办单位待定",
  ].some((token) => normalized.includes(token));
}

function priceTone(event: Event) {
  return event.priceType === "free"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-900";
}

function InfoLine({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl ${
        muted ? "bg-slate-100 text-slate-400" : "bg-purple-50 text-purple-700"
      }`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
        <p
          className={`mt-0.5 line-clamp-1 text-xs font-extrabold ${
            muted ? "text-slate-400" : "text-slate-700"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function PublicEventCard({
  event,
  locale,
  featured = false,
  compact = false,
  className = "",
}: PublicEventCardProps) {
  const dateText = formatCardDate(event, locale);
  const category = event.category || text(locale, "親子活動", "亲子活动", "Family");
  const price = event.price || text(locale, "詳情請看官方資料", "详情请看官方资料", "See official details");
  const mtrMissing = isPlaceholder(event.mtrStation);
  const organizerMissing = isPlaceholder(event.organizer);
  const ageMissing = isPlaceholder(event.ageRange);

  if (compact) {
    return (
      <article className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md ${className}`}>
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 p-3">
          <Link
            href={`/events/${event.id}`}
            className="relative block aspect-square overflow-hidden rounded-xl bg-slate-100"
          >
            <ResilientEventImage
              src={event.image}
              alt={event.title}
              loading="lazy"
              compactFallback
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            />
            <span className={`absolute bottom-1.5 left-1.5 rounded-full px-2 py-1 text-[10px] font-black shadow-sm ${priceTone(event)}`}>
              {price}
            </span>
          </Link>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-700">
                {category}
              </span>
              {event.senFriendly ? (
                <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[10px] font-black text-fuchsia-700">
                  SEN 友善
                </span>
              ) : null}
            </div>

            <Link href={`/events/${event.id}`}>
              <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5 text-slate-950 group-hover:text-purple-800">
                {event.title}
              </h3>
            </Link>

            <p className="mt-1 line-clamp-1 text-[11px] font-bold text-slate-500">
              {dateText} · {event.time}
            </p>
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
              {event.district}
              {!mtrMissing ? ` · ${text(locale, "港鐵", "港铁", "MTR")} ${event.mtrStation}` : ""}
            </p>

            <Link
              href={`/events/${event.id}`}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-purple-700"
            >
              {text(locale, "查看詳情", "查看详情", "View details")}
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl ${
        featured ? "rounded-[2rem]" : "rounded-3xl"
      } ${className}`}
    >
      <Link
        href={`/events/${event.id}`}
        className={`relative block overflow-hidden bg-gradient-to-br from-purple-50 via-white to-amber-50 ${
          featured ? "aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <ResilientEventImage
          src={event.image}
          alt={event.title}
          loading="lazy"
          compactFallback
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.045]"
        />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent" />

        <div className="absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-2">
          {featured ? (
            <span className="rounded-full bg-purple-700 px-3 py-1 text-[11px] font-black text-white shadow-sm">
              {text(locale, "精選推介", "精选推介", "Featured")}
            </span>
          ) : null}
          <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-purple-800 shadow-sm backdrop-blur">
            {category}
          </span>
          {event.senFriendly ? (
            <span className="rounded-full bg-fuchsia-100/95 px-3 py-1 text-[11px] font-black text-fuchsia-800 shadow-sm backdrop-blur">
              SEN 友善
            </span>
          ) : null}
        </div>

        <span className={`absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${priceTone(event)}`}>
          {price}
        </span>

        <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur">
          📍 {event.district}
        </span>
      </Link>

      <div className={`flex flex-1 flex-col ${featured ? "p-5 sm:p-6" : "p-5"}`}>
        <Link href={`/events/${event.id}`}>
          <h3
            className={`line-clamp-2 min-h-[3.25rem] font-black leading-snug text-slate-950 transition group-hover:text-purple-800 ${
              featured ? "text-xl sm:text-2xl" : "text-lg"
            }`}
          >
            {event.title}
          </h3>
        </Link>

        {event.shortDescription ? (
          <p className="mt-2 line-clamp-2 min-h-[2.75rem] text-sm font-medium leading-6 text-slate-600">
            {event.shortDescription}
          </p>
        ) : null}

        <div className="mt-4 grid gap-x-4 gap-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:grid-cols-2">
          <InfoLine
            icon={<CalendarDays size={15} />}
            label={text(locale, "日期", "日期", "Date")}
            value={dateText}
          />
          <InfoLine
            icon={<Clock3 size={15} />}
            label={text(locale, "時間", "时间", "Time")}
            value={event.time}
          />
          <InfoLine
            icon={<MapPin size={15} />}
            label={text(locale, "地區", "地区", "District")}
            value={event.district}
          />
          <InfoLine
            icon={<TrainFront size={15} />}
            label={text(locale, "港鐵", "港铁", "MTR")}
            value={
              mtrMissing
                ? text(locale, "待主辦方補充", "待主办方补充", "TBC")
                : event.mtrStation
            }
            muted={mtrMissing}
          />
          <InfoLine
            icon={<Baby size={15} />}
            label={text(locale, "年齡", "年龄", "Age")}
            value={
              ageMissing
                ? text(locale, "適合年齡待定", "适合年龄待定", "Age TBC")
                : event.ageRange
            }
            muted={ageMissing}
          />
          <InfoLine
            icon={<Building2 size={15} />}
            label={text(locale, "主辦", "主办", "Organizer")}
            value={
              organizerMissing
                ? text(locale, "主辦方待定", "主办方待定", "Organizer TBC")
                : event.organizer
            }
            muted={organizerMissing}
          />
        </div>

        {event.tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-bold text-purple-700 ring-1 ring-purple-100"
              >
                #{tag}
              </span>
            ))}
            {event.tags.length > 4 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                +{event.tags.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-800"
          >
            {text(locale, "查看詳情", "查看详情", "View details")}
            <ArrowUpRight size={15} />
          </Link>

          {event.officialLink ? (
            <a
              href={event.officialLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-purple-300 hover:text-purple-800"
            >
              {text(locale, "官方資料／報名", "官方资料／报名", "Official / Book")}
              <ArrowUpRight size={15} />
            </a>
          ) : (
            <span className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-400 ring-1 ring-slate-200">
              {text(locale, "官方連結待定", "官方链接待定", "Official link TBC")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
