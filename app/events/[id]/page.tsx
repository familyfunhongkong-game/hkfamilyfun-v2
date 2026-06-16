import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Train,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EventGrid } from "@/components/events/EventGrid";
import { getEventById, mockEvents } from "@/lib/mock-events";
import {
  cn,
  formatEventDate,
  getEventShareMessage,
  getTagColor,
  getWhatsAppUrl,
} from "@/lib/utils";

interface EventDetailPageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return mockEvents.map((event) => ({ id: event.id }));
}

export function generateMetadata({ params }: EventDetailPageProps): Metadata {
  const event = getEventById(params.id);
  if (!event) return { title: "活動不存在" };

  return {
    title: event.title,
    description: event.shortDescription,
  };
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const event = getEventById(params.id);
  if (!event) notFound();

  const relatedEvents = mockEvents
    .filter(
      (item) =>
        item.id !== event.id &&
        (item.category === event.category || item.district === event.district)
    )
    .slice(0, 3);

  return (
    <div className="pb-16">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600"
          >
            <ArrowLeft size={16} />
            返回活動列表
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-3xl bg-gray-100">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <Badge variant={event.priceType === "free" ? "free" : "paid"}>
                  {event.priceType === "free" ? "免費" : "收費"}
                </Badge>
                {event.senFriendly && <Badge variant="sen">SEN 友善</Badge>}
              </div>
            </div>

            <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              {event.title}
            </h1>

            <div className="mb-6 flex flex-wrap gap-2">
              {event.tags.map((tag, index) => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium",
                    getTagColor(index)
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-xl font-bold text-gray-900">活動詳情</h2>
              <p className="leading-relaxed text-gray-600">{event.description}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 card-shadow">
              <h2 className="mb-4 text-lg font-bold text-gray-900">活動資訊</h2>

              <dl className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 shrink-0 text-primary-500" size={18} />
                  <div>
                    <dt className="font-medium text-gray-500">日期</dt>
                    <dd className="text-gray-900">
                      {formatEventDate(event.date, event.endDate)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 shrink-0 text-primary-500" size={18} />
                  <div>
                    <dt className="font-medium text-gray-500">時間</dt>
                    <dd className="text-gray-900">{event.time}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 shrink-0 text-primary-500" size={18} />
                  <div>
                    <dt className="font-medium text-gray-500">地區 / 地址</dt>
                    <dd className="text-gray-900">
                      {event.district}
                      {event.address && (
                        <span className="block text-gray-600">{event.address}</span>
                      )}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Train className="mt-0.5 shrink-0 text-primary-500" size={18} />
                  <div>
                    <dt className="font-medium text-gray-500">港鐵站</dt>
                    <dd className="text-gray-900">{event.mtrStation} 站</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Users className="mt-0.5 shrink-0 text-primary-500" size={18} />
                  <div>
                    <dt className="font-medium text-gray-500">適合年齡</dt>
                    <dd className="text-gray-900">{event.ageRange}</dd>
                  </div>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">主辦機構</dt>
                  <dd className="text-gray-900">{event.organizer}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">類別</dt>
                  <dd className="text-gray-900">{event.category}</dd>
                </div>
                {event.price && (
                  <div>
                    <dt className="font-medium text-gray-500">票價</dt>
                    <dd className="text-gray-900">{event.price}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-6 space-y-3 border-t border-gray-100 pt-6">
                {event.officialLink && (
                  <a
                    href={event.officialLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    <ExternalLink size={16} />
                    官方連結
                  </a>
                )}
                <a
                  href={getWhatsAppUrl(getEventShareMessage(event))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                >
                  WhatsApp 分享
                </a>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Bookmark size={16} />
                  收藏活動
                </button>
              </div>
            </div>
          </div>
        </div>

        {relatedEvents.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">相關活動</h2>
            <EventGrid events={relatedEvents} />
          </section>
        )}
      </div>
    </div>
  );
}
