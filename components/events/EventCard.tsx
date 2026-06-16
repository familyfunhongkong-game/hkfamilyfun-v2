"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Train,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { Event } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn, formatEventDate, getEventShareMessage, getTagColor, getWhatsAppUrl } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  className?: string;
}

export function EventCard({ event, className }: EventCardProps) {
  const [saved, setSaved] = useState(false);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white card-shadow transition hover:-translate-y-0.5 hover:shadow-lg",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant={event.priceType === "free" ? "free" : "paid"}>
            {event.priceType === "free" ? "免費" : "收費"}
          </Badge>
          {event.senFriendly && <Badge variant="sen">SEN 友善</Badge>}
        </div>
        <button
          type="button"
          onClick={() => setSaved(!saved)}
          className={cn(
            "absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition hover:bg-white",
            saved && "text-primary-600"
          )}
          aria-label={saved ? "取消收藏" : "收藏活動"}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900">
          {event.title}
        </h3>

        <div className="mb-3 space-y-1.5 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="shrink-0 text-primary-500" />
            <span>{formatEventDate(event.date, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={15} className="shrink-0 text-primary-500" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={15} className="shrink-0 text-primary-500" />
            <span>{event.district}</span>
          </div>
          <div className="flex items-center gap-2">
            <Train size={15} className="shrink-0 text-primary-500" />
            <span>{event.mtrStation} 站</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={15} className="shrink-0 text-primary-500" />
            <span>{event.ageRange}</span>
          </div>
        </div>

        <p className="mb-1 text-xs font-medium text-gray-500">
          主辦：{event.organizer}
        </p>
        <p className="mb-4 line-clamp-2 text-sm text-gray-600">
          {event.shortDescription}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {event.tags.map((tag, index) => (
            <span
              key={tag}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                getTagColor(index)
              )}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 sm:flex-none"
          >
            查看詳情
          </Link>
          {event.officialLink && (
            <a
              href={event.officialLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ExternalLink size={15} />
              官方連結
            </a>
          )}
          <a
            href={getWhatsAppUrl(getEventShareMessage(event))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-100"
          >
            WhatsApp 分享
          </a>
        </div>
      </div>
    </article>
  );
}
