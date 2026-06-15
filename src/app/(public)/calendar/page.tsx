'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import EventTimeline from '@/components/events/EventTimeline';
import EventCalendar from '@/components/events/EventCalendar';
import { supabase } from '@/lib/supabase';
import type { EventSchedule } from '@/types';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSchedules = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase
          .from('event_schedules')
          .select('*, events(*)')
          .gte('date', format(new Date(), 'yyyy-MM-dd'))
          .order('date', { ascending: true });

        setSchedules(data || []);
        setEventDates((data || []).map(s => s.date));
      } catch (error) {
        console.error('Error loading schedules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedules();
  }, []);

  const todaySchedules = schedules
    .filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
    .map(s => ({
      ...s.events,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold mb-12">Event Calendar</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <EventCalendar
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
            eventDates={eventDates}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {format(selectedDate, 'MMMM d, yyyy')}
            </h2>
            <p className="text-gray-600">{todaySchedules.length} events scheduled</p>
          </div>
          <EventTimeline
            events={todaySchedules}
            date={selectedDate}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
