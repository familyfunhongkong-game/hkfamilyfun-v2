"use client";

import type { Event } from "@/lib/types";
import PublicEventCard from "@/components/events/PublicEventCard";

interface EventCardProps {
  event: Event;
  className?: string;
}

/**
 * Legacy compatibility wrapper.
 *
 * Keep all public event-card behaviour in PublicEventCard so older EventGrid
 * consumers cannot drift away from favorites, calendar actions, hashtag
 * colours, accessibility labels, or the current mobile layout.
 */
export function EventCard({ event, className = "" }: EventCardProps) {
  return (
    <PublicEventCard
      event={event}
      locale="zh-Hant"
      className={className}
    />
  );
}
