import { supabase } from '../supabase';
import type { Favorite } from '@/types';

export async function getUserFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Favorite[];
}

export async function addFavorite(userId: string, eventId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .insert([{ user_id: userId, event_id: eventId }])
    .select()
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Ignore duplicate
  return data as Favorite | null;
}

export async function removeFavorite(userId: string, eventId: string) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId);
  
  if (error) throw error;
}

export async function isFavorite(userId: string, eventId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Not found is ok
  return !!data;
}
