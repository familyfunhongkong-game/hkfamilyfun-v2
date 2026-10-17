import Link from "next/link";
import type { Event } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n/config";
import ResilientEventImage from "@/components/resilient-event-image";

function eventDateLabel(event: Event, locale: AppLocale): string {
  const translate = (tc: string, sc: string, en: string) =>
    locale === "en" ? en : locale === "zh-Hans" ? sc : tc;
  const valid = (s: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  if (!valid(event.date)) return translate("日期待定", "日期待定", "Date TBC");
  const start = event.date;
  const end = valid(event.endDate) ? event.endDate! : start;
  const localDate = (date: string) => {
    const [year, month, day] = date.split("-");
    return locale === "en" ? `${day}/${month}/${year}` : `${Number(month)}月${Number(day)}日`;
  };
  const range = start === end ? localDate(start) : `${localDate(start)} – ${localDate(end)}`;
  if (event.recurrenceType === "weekly" && event.recurrenceWeekdays?.length) {
    const names = locale === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["日", "一", "二", "三", "四", "五", "六"];
    const days = [...new Set(event.recurrenceWeekdays)].sort((a, b) => a - b)
      .filter(d => d >= 0 && d <= 6).map(d => names[d]).join("、");
    return `${range} · ${translate("逢星期", "逢星期", "Every ")}${days}`;
  }
  return range;
}

function eventPriceLabel(event: Event, locale: AppLocale): string {
  const tr = (tc: string, sc: string, en: string) =>
    locale === "en" ? en : locale === "zh-Hans" ? sc : tc;
  if (event.priceType === "free") return tr("免費", "免费", "Free");
  const detail = (event.price || "").trim();
  if (detail) return detail;
  return event.priceType === "mixed"
    ? tr("免費及收費項目", "免费及收费项目", "Free & paid")
    : tr("收費待公布", "收费待公布", "Price TBC");
}

export default function FeaturedEditorialCard({ event, locale }: { event: Event; locale: AppLocale }) {
  const cta = locale === "en" ? "Discover more" : "了解更多";
  const kicker = locale === "en" ? "HK Family Fun Pick" : locale === "zh-Hans" ? "精选推介" : "精選推介";
  const destination = `/featured/${encodeURIComponent(event.id)}`;
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={destination} className="block aspect-[16/10] overflow-hidden bg-slate-100" aria-label={`${cta}：${event.title}`}>
        <ResilientEventImage src={event.image} alt={event.title} loading="lazy" compactFallback className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs font-bold text-purple-700">{kicker}{event.category ? " · " + event.category : ""}</p>
        <h3 className="line-clamp-2 text-xl font-extrabold leading-snug text-slate-950">{event.title}</h3>
        {event.shortDescription && <p className="line-clamp-2 text-sm leading-6 text-slate-600">{event.shortDescription}</p>}
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{eventDateLabel(event, locale)}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">{eventPriceLabel(event, locale)}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="truncate text-xs text-slate-500">{event.district}</span>
          <Link href={destination} className="inline-flex shrink-0 items-center justify-center rounded-full bg-purple-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-800">{cta} ↗</Link>
        </div>
      </div>
    </article>
  );
}
