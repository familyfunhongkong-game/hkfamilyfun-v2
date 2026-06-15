import { supabase } from '../supabase';
import type { CommunityPost, CommunityComment, CommunityLike } from '@/types';

export async function getApprovedPosts(filters?: {
  category_id?: string;
  district?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('community_posts')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.district) {
    query = query.eq('district', filters.district);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as CommunityPost[];
}

export async function getPostById(id: string) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as CommunityPost;
}

export async function createPost(post: Omit<CommunityPost, 'id' | 'created_at' | 'updated_at' | 'approved_at'>) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert([post])
    .select()
    .single();
  
  if (error) throw error;
  return data as CommunityPost;
}

export async function getPostComments(postId: string) {
  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', postId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as CommunityComment[];
}

export async function addComment(comment: Omit<CommunityComment, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('community_comments')
    .insert([comment])
    .select()
    .single();
  
  if (error) throw error;
  return data as CommunityComment;
}

export async function likePost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from('community_post_likes')
    .insert([{ post_id: postId, user_id: userId }])
    .select()
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Ignore duplicate key error
  return data as CommunityLike | null;
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from('community_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  
  if (error) throw error;
}
