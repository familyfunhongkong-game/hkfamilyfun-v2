'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, Users } from 'lucide-react';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onFavoriteClick?: (eventId: string) => void;
  isFavorite?: boolean;
}

export default function EventCard({ event, onFavoriteClick, isFavorite }: EventCardProps) {
  const priceDisplay = event.price_from && event.price_to
    ? `HK$${event.price_from} - HK$${event.price_to}`
    : event.price_from
    ? `From HK$${event.price_from}`
    : 'Free';

  const ageDisplay = event.age_range_min && event.age_range_max
    ? `${event.age_range_min} - ${event.age_range_max} years`
    : 'All ages';

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <Link href={`/activities/${event.id}`}>
        <div className="relative h-40 bg-gray-200 overflow-hidden">
          {event.thumbnail_url ? (
            <Image
              src={event.thumbnail_url}
              alt={event.title}
              fill
              className="object-cover hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-200 to-secondary-200" />
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Link href={`/activities/${event.id}`} className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 hover:text-primary-600 line-clamp-2">
              {event.title}
            </h3>
          </Link>
          <button
            onClick={() => onFavoriteClick?.(event.id)}
            className="ml-2 flex-shrink-0"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isFavorite
                  ? 'fill-danger text-danger'
                  : 'text-gray-300 hover:text-danger'
              }`}
            />
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{ageDisplay}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="font-semibold text-primary-600">{priceDisplay}</span>
          <Link
            href={`/activities/${event.id}`}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
