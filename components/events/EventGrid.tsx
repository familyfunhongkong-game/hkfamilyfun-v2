import type { Event } from "@/lib/types";
import { EventCard } from "./EventCard";

interface EventGridProps {
  events: Event[];
  emptyMessage?: string;
}

export function EventGrid({
  events,
  emptyMessage = "暫時沒有符合條件的活動。",
}: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
