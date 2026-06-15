'use client';

import EventCard from './EventCard';
import type { Event } from '@/types';

interface EventGridProps {
  events: Event[];
  isLoading?: boolean;
  onFavoriteClick?: (eventId: string) => void;
  favorites?: Set<string>;
}

export default function EventGrid({
  events,
  isLoading,
  onFavoriteClick,
  favorites,
}: EventGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No events found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onFavoriteClick={onFavoriteClick}
          isFavorite={favorites?.has(event.id)}
        />
      ))}
    </div>
  );
}
