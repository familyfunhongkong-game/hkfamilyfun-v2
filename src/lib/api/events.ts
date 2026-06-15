import { supabase } from '../supabase';
import type { Event, EventSchedule } from '@/types';

export async function getApprovedEvents(filters?: {
  category_id?: string;
  district?: string;
  age_min?: number;
  age_max?: number;
  price_min?: number;
  price_max?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('events')
    .select('*')
    .eq('status', 'approved')
    .order('starts_at', { ascending: true });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.district) {
    query = query.eq('district', filters.district);
  }
  if (filters?.age_min !== undefined) {
    query = query.gte('age_range_max', filters.age_min);
  }
  if (filters?.age_max !== undefined) {
    query = query.lte('age_range_min', filters.age_max);
  }
  if (filters?.price_min !== undefined || filters?.price_max !== undefined) {
    if (filters.price_min !== undefined) {
      query = query.lte('price_from', filters.price_min);
    }
    if (filters.price_max !== undefined) {
      query = query.gte('price_to', filters.price_max);
    }
  }
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Event[];
}

export async function getEventById(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Event;
}

export async function getEventSchedules(eventId: string) {
  const { data, error } = await supabase
    .from('event_schedules')
    .select('*')
    .eq('event_id', eventId)
    .order('date', { ascending: true });
  
  if (error) throw error;
  return data as EventSchedule[];
}

export async function getMerchantEvents(merchantId: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Event[];
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();
  
  if (error) throw error;
  return data as Event;
}

export async function updateEvent(id: string, updates: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}
