import { supabase } from '../supabase';
import type { Merchant } from '@/types';

export async function getMerchantByUserId(userId: string) {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Not found is ok
  return data as Merchant | null;
}

export async function createMerchant(merchant: Omit<Merchant, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('merchants')
    .insert([merchant])
    .select()
    .single();
  
  if (error) throw error;
  return data as Merchant;
}

export async function updateMerchant(id: string, updates: Partial<Merchant>) {
  const { data, error } = await supabase
    .from('merchants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Merchant;
}

export async function getPendingMerchants() {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as Merchant[];
}
