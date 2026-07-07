import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublishedEventById } from "@/lib/supabase/events";

export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: EventDetailPageProps): Promise<Metadata> {
  const event = await getPublishedEventById(params.id);

  if (!event) {
    return {
      title: "找不到活動 | HK Family Fun",
    };
  }

  return {
    title: `${event.title} | HK Family Fun`,
    description: event.shortDescription,
  };
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const event = await getPublishedEventById(params.id);

  if (!event) {
    notFound();
  }

  const shareText = encodeURIComponent(
    `【${event.title}】${event.date}｜${event.district}\n${event.shortDescription}`
  );

  const shareUrl = encodeURIComponent(
    `http://localhost:3000/events/${event.id}`
  );

  const whatsappUrl = `https://wa.me/?text=${shareText}%0A${shareUrl}`;

  return (
    <main className="bg-slate-50 pb-16 pt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/events"
          className="inline-flex items-center text-sm font-bold text-violet-600 transition hover:text-violet-800"
        >
          ← 返回活動搜尋
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="grid lg:grid-cols-2">
            <div className="min-h-[280px] bg-slate-100 lg:min-h-[460px]">
              <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap gap-2">
                {event.priceType === "free" ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    免費
                  </span>
                ) : (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    收費活動
                  </span>
                )}

                {event.senFriendly ? (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                    SEN 友善
                  </span>
                ) : null}

                {event.featured ? (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                    精選活動
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
                {event.title}
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-600">
                {event.shortDescription}
              </p>

              <div className="mt-7 space-y-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
                <div>
                  <p className="font-bold text-slate-900">📅 日期</p>
                  <p className="mt-1">
                    {event.date}
                    {event.endDate && event.endDate !== event.date
                      ? ` 至 ${event.endDate}`
                      : ""}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">🕒 時間</p>
                  <p className="mt-1">{event.time}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">📍 地點</p>
                  <p className="mt-1">
                    {event.address || event.district}
                    {event.mtrStation ? ` · 港鐵 ${event.mtrStation}站` : ""}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">👨‍👩‍👧 適合年齡</p>
                  <p className="mt-1">{event.ageRange}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">💰 收費</p>
                  <p className="mt-1">{event.price || "詳情請見官方網站"}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">🏢 主辦單位</p>
                  <p className="mt-1">{event.organizer}</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {event.officialLink ? (
                  <a
                    href={event.officialLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    官方活動連結 ↗
                  </a>
                ) : null}

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                >
                  WhatsApp 分享
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-6 sm:p-8 lg:p-10">
            <h2 className="text-2xl font-black text-slate-900">活動詳情</h2>

            <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
              {event.description}
            </p>

            {event.tags.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <p className="font-bold">家長留意</p>
              <p className="mt-1">
                活動資料由主辦單位或公開來源提供，日期、時間、收費及安排可能更改，請以主辦單位官方資料為準。
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}