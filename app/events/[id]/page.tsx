"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  Tag,
  Ticket,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type PublicEvent = {
  id: string;
  title_tc: string | null;
  short_description_tc: string | null;
  description_tc: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  mtr_station: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  category: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  registration_required: boolean | null;
  registration_url: string | null;
  is_sen_friendly: boolean | null;
  is_indoor: boolean | null;
  status: string | null;
};

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDateRange(event: PublicEvent) {
  if (!event.start_date && !event.end_date) return "日期待確認";

  const start = event.start_date || "";
  const end = event.end_date || "";

  if (start && end && start !== end) return `${start} 至 ${end}`;
  return start || end || "日期待確認";
}

function formatTimeRange(event: PublicEvent) {
  if (!event.start_time && !event.end_time) return "時間待確認";

  const start = event.start_time ? event.start_time.slice(0, 5) : "";
  const end = event.end_time ? event.end_time.slice(0, 5) : "";

  if (start && end) return `${start} - ${end}`;
  return start || end || "時間待確認";
}

function formatPrice(event: PublicEvent) {
  if (event.price_type === "free") return "免費";
  if (!event.price_type || event.price_type === "unknown") return "收費待確認";

  const min = Number(event.price_min || 0);
  const max = Number(event.price_max || 0);

  if (min === 0 && max === 0) return "收費待確認";
  if (min === max) return `HK$${min}`;
  return `HK$${min} - HK$${max}`;
}

export default function PublicEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params.id || "");

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPublicEvent() {
    setIsLoading(true);
    setErrorMessage("");

    if (!uuidRegex.test(eventId)) {
      setEvent(null);
      setIsLoading(false);
      return;
    }

    try {
      if (!supabase) {
        setErrorMessage(
          "Supabase client 未能初始化。請檢查 .env.local 的 Supabase 設定。"
        );
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          [
            "id",
            "title_tc",
            "short_description_tc",
            "description_tc",
            "organizer_name",
            "venue_name",
            "address",
            "district",
            "mtr_station",
            "start_date",
            "end_date",
            "start_time",
            "end_time",
            "price_type",
            "price_min",
            "price_max",
            "category",
            "tags",
            "cover_image_url",
            "registration_required",
            "registration_url",
            "is_sen_friendly",
            "is_indoor",
            "status",
          ].join(", ")
        )
        .eq("id", eventId)
        .eq("status", "published")
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setEvent(null);
        setIsLoading(false);
        return;
      }

      setEvent(data as unknown as PublicEvent);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "載入活動詳情時發生未知錯誤。"
      );
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPublicEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">正在載入活動詳情...</p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">載入失敗</h1>
          <p className="mt-2 text-sm text-red-700">{errorMessage}</p>

          <button
            type="button"
            onClick={() => router.push("/events")}
            className="mt-5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            返回活動列表
          </button>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            找不到公開活動
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            此活動可能仍在審批中、已被退回、或尚未公開發布。
          </p>

          <Link
            href="/events"
            className="mt-6 inline-flex rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600"
          >
            返回搜尋活動
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-4 py-8">
        <button
          type="button"
          onClick={() => router.push("/events")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回活動列表
        </button>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-80 bg-slate-100">
            <img
              src={event.cover_image_url || FALLBACK_COVER_IMAGE}
              alt={event.title_tc || "Event cover"}
              className="h-full w-full object-cover"
            />

            <div className="absolute left-6 top-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-600 shadow-sm">
              {event.category || "親子活動"}
            </div>
          </div>

          <div className="grid gap-8 p-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="text-sm font-semibold text-primary-600">
                HK Family Fun Event
              </p>

              <h1 className="mt-2 text-4xl font-bold text-slate-950">
                {event.title_tc || "未命名活動"}
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-600">
                {event.short_description_tc || "未有活動簡介。"}
              </p>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-bold text-slate-950">
                  活動詳情
                </h2>

                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {event.description_tc || "未有詳細活動內容。"}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {(event.tags || ["親子活動"]).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  活動資料
                </h2>

                <div className="mt-5 space-y-4 text-sm text-slate-700">
                  <div className="flex gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        日期及時間
                      </div>
                      <div>
                        {formatDateRange(event)} · {formatTimeRange(event)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <div>
                      <div className="font-semibold text-slate-900">地點</div>
                      <div>
                        {event.venue_name || "場地待確認"} ·{" "}
                        {event.district || "地區待確認"} ·{" "}
                        {event.mtr_station || "港鐵站待確認"}
                      </div>

                      {event.address ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {event.address}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <div>
                      <div className="font-semibold text-slate-900">收費</div>
                      <div>{formatPrice(event)}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <div>
                      <div className="font-semibold text-slate-900">
                        主辦單位
                      </div>
                      <div>{event.organizer_name || "待確認"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {event.registration_url ? (
                <a
                  href={event.registration_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-4 text-sm font-semibold text-white hover:bg-primary-600"
                >
                  前往報名 / 官方資料
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                <strong>家長注意：</strong>
                活動資料以主辦單位官方公布為準。出發前請再次確認日期、時間、票價、報名及場地安排。
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}