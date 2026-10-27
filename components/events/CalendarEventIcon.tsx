"use client";

import { useState } from "react";
import Link from "next/link";
import type { Event } from "@/lib/types";
import { getCalendarEventIcon, getCalendarThumbnailUrl } from "@/lib/events/calendar-icons";

/** A separate focusable link for each visible event, never nested in a date link. */
export default function CalendarEventIcon({ event }: { event: Event }) {
  const icon = getCalendarEventIcon({ category: event.category, title: event.title });
  const thumbnail = getCalendarThumbnailUrl(event.image);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const showImage = Boolean(thumbnail && failedImage !== thumbnail);

  return (
    <Link
      href={`/events/${encodeURIComponent(event.id)}`}
      title={event.title}
      aria-label={`${event.title} — ${icon.label}`}
      className="inline-flex shrink-0 rounded-lg outline-offset-2 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600"
    >
      <span
        className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg ring-1 ring-slate-200 sm:h-8 sm:w-8"
        style={{ backgroundColor: `${icon.color}1A` }}
      >
        <span aria-hidden="true" className="text-base leading-none sm:text-lg">{icon.emoji}</span>
        {showImage && thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setFailedImage(thumbnail)}
          />
        ) : null}
      </span>
    </Link>
  );
}
