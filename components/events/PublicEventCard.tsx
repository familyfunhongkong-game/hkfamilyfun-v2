"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Baby,
  Building2,
  CalendarDays,
  Clock3,
  MapPin,
  TrainFront,
  Heart,
  CalendarPlus,
} from "lucide-react";
import type { Event } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n/config";
import ResilientEventImage from "@/components/resilient-event-image";
import { displayTag, tagTone } from "@/lib/events/tag-tone";
import { formatEventCardDate } from "@/lib/events/card-date";
import { formatWeeklyDays } from "@/lib/events/weekly-label";


const FAVORITES_STORAGE_KEY = "hkff_favorite_event_ids";
const FAVORITES_CHANGED_EVENT = "hkff:favorites-changed";

function readFavoriteIds() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

function escapeIcsText(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function dateToken(value?: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : "";
}

function nextDateToken(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + 1);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}

function parseTimeRange(value?: string) {
  const matches = String(value || "").match(/\b(\d{1,2}):(\d{2})\b/g) || [];
  const normalize = (raw?: string) => {
    if (!raw) return "";
    const [hour, minute] = raw.split(":");
    return `${hour.padStart(2, "0")}${minute}00`;
  };

  return {
    start: normalize(matches[0]),
    end: normalize(matches[1]),
  };
}

function buildIcs(event: Event) {
  const startDate = dateToken(event.date);
  const endDate = dateToken(event.endDate || event.date);
  const times = parseTimeRange(event.time);
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HK Family Fun//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.id)}@hkfamilyfun.com`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.shortDescription || event.description || "")}`,
    `LOCATION:${escapeIcsText([event.district, event.address].filter(Boolean).join(" · "))}`,
  ];

  if (startDate && times.start) {
    lines.push(`DTSTART;TZID=Asia/Hong_Kong:${startDate}T${times.start}`);
    lines.push(
      `DTEND;TZID=Asia/Hong_Kong:${startDate}T${times.end || times.start}`,
    );

    if (
      event.recurrenceType === "weekly" &&
      event.endDate &&
      event.recurrenceWeekdays?.length
    ) {
      const byDay = event.recurrenceWeekdays
        .map((day) => ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][day])
        .filter(Boolean)
        .join(",");
      lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${endDate}T155959Z;BYDAY=${byDay}`);
    }
  } else if (startDate) {
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${nextDateToken(event.endDate || event.date)}`);
  }

  if (event.officialLink) {
    lines.push(`URL:${event.officialLink}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadCalendarEvent(event: Event) {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${event.title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) || "hk-family-fun-event"}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

function coverCropStyle(event: Event) {
  const x = Math.max(-50, Math.min(50, event.coverImageOffsetX ?? 0));
  const y = Math.max(-50, Math.min(50, event.coverImageOffsetY ?? 0));
  const zoom = Math.max(1, Math.min(2.5, event.coverImageZoom ?? 1));

  return {
    transform: `translate(${x}%, ${y}%) scale(${zoom})`,
    transformOrigin: "center",
  };
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
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
          {label}
        </p>
        <p
          className={`mt-0.5 line-clamp-2 break-words text-[13px] font-bold leading-5 ${
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
  const dateText = formatEventCardDate(event.date, event.endDate, locale);
  const weeklyLabel = event.recurrenceType === "weekly" ? formatWeeklyDays(event.recurrenceWeekdays, locale) : "";
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(readFavoriteIds());
    syncFavorites();
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    window.addEventListener("storage", syncFavorites);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
      window.removeEventListener("storage", syncFavorites);
    };
  }, []);

  const isFavorite = favoriteIds.includes(event.id);

  const toggleFavorite = () => {
    const current = readFavoriteIds();
    const next = current.includes(event.id)
      ? current.filter((id) => id !== event.id)
      : [...current, event.id];
    writeFavoriteIds(next);
  };

  const addToCalendar = () => downloadCalendarEvent(event);
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
              className="h-full w-full object-cover transition-transform duration-300"
              style={coverCropStyle(event)}
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
              {event.indoor ? (
                <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">
                  {text(locale, "室內", "室内", "Indoor")}
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
            {weeklyLabel ? <p className="mt-1 text-[11px] font-bold text-purple-700">{weeklyLabel}</p> : null}
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
              {event.district}
              {!mtrMissing ? ` · ${text(locale, "港鐵", "港铁", "MTR")} ${event.mtrStation}` : ""}
            </p>
            <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-500">
              {ageMissing
                ? text(locale, "年齡待定", "年龄待定", "Age TBC")
                : event.ageRange}
              {" · "}
              {organizerMissing
                ? text(locale, "主辦方待定", "主办方待定", "Organizer TBC")
                : event.organizer}
            </p>

            {event.tags.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {event.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ${tagTone(tag)}`}
                  >
                    {displayTag(tag)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? text(locale, "取消收藏", "取消收藏", "Remove saved event") : text(locale, "收藏活動", "收藏活动", "Save event")}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black ring-1 transition ${isFavorite ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-white text-slate-600 ring-slate-200"}`}
              >
                <Heart size={12} fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? text(locale, "已收藏", "已收藏", "Saved") : text(locale, "收藏", "收藏", "Save")}
              </button>
              <button
                type="button"
                onClick={addToCalendar}
                className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1.5 text-[10px] font-black text-sky-700 ring-1 ring-sky-100"
              >
                <CalendarPlus size={12} />
                {text(locale, "加日曆", "加日历", "Calendar")}
              </button>
              <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-black text-purple-700"
              >
                {text(locale, "查看詳情", "查看详情", "View details")}
                <ArrowUpRight size={12} />
              </Link>
            </div>
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
          featured ? "aspect-[16/10]" : "aspect-[5/4]"
        }`}
      >
        <ResilientEventImage
          src={event.image}
          alt={event.title}
          loading="lazy"
          compactFallback
          className="h-full w-full object-contain transition-transform duration-500"
          style={coverCropStyle(event)}
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
          {event.indoor ? (
            <span className="rounded-full bg-sky-100/95 px-3 py-1 text-[11px] font-black text-sky-800 shadow-sm backdrop-blur">
              {text(locale, "室內", "室内", "Indoor")}
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
            className={`line-clamp-3 min-h-[3.25rem] font-black leading-snug text-slate-950 transition group-hover:text-purple-800 ${
              featured ? "text-xl sm:text-2xl" : "text-lg"
            }`}
          >
            {event.title}
          </h3>
        </Link>

        {event.shortDescription ? (
          <p className="mt-2 line-clamp-3 min-h-[2.75rem] text-sm font-medium leading-6 text-slate-600">
            {event.shortDescription}
          </p>
        ) : null}

        <div className="mt-4 grid gap-x-5 gap-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:grid-cols-2">
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

        {weeklyLabel ? (
          <p className="mt-3 inline-flex self-start rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">{weeklyLabel}</p>
        ) : null}

        {event.tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${tagTone(tag)}`}
              >
                {displayTag(tag)}
              </span>
            ))}
            {event.tags.length > 4 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                +{event.tags.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={toggleFavorite}
            aria-pressed={isFavorite}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black ring-1 transition ${isFavorite ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-white text-slate-700 ring-slate-200 hover:ring-rose-200 hover:text-rose-700"}`}
          >
            <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
            {isFavorite
              ? text(locale, "已收藏", "已收藏", "Saved")
              : text(locale, "收藏", "收藏", "Save")}
          </button>
          <button
            type="button"
            onClick={addToCalendar}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
          >
            <CalendarPlus size={15} />
            {text(locale, "加入日曆", "加入日历", "Add to calendar")}
          </button>
        </div>

        <div className="mt-auto grid gap-2 pt-3 sm:grid-cols-2">
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
