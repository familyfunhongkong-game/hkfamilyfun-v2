'use client';

import { useEffect, useState } from 'react';
import EventGrid from '@/components/events/EventGrid';
import FilterBar, { FilterState } from '@/components/filters/FilterBar';
import { getApprovedEvents } from '@/lib/api/events';
import { supabase } from '@/lib/supabase';
import type { Event, Category, District } from '@/types';

export default function ActivitiesPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [eventsData, categoriesData, districtsData] = await Promise.all([
          getApprovedEvents({ limit: 100 }),
          supabase.from('categories').select('*').order('display_order'),
          supabase.from('districts').select('*').order('name'),
        ]);

        setEvents(eventsData);
        setCategories(categoriesData.data || []);
        setDistricts(districtsData.data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('favorites')
          .select('event_id')
          .eq('user_id', user.id);

        setFavorites(new Set(data?.map(f => f.event_id) || []));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    loadFavorites();
  }, []);

  const handleFavorite = async (eventId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      if (favorites.has(eventId)) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, event_id: eventId }]);
        setFavorites(prev => new Set([...prev, eventId]));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-12">Discover Activities</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div>
          <FilterBar
            categories={categories}
            districts={districts}
            onFilter={setFilters}
          />
        </div>

        <div className="lg:col-span-3">
          <EventGrid
            events={events}
            isLoading={isLoading}
            onFavoriteClick={handleFavorite}
            favorites={favorites}
          />
        </div>
      </div>
    </div>
  );
}
