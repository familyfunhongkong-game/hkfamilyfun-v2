// Core types
export type UserRole = 'admin' | 'merchant' | 'user';
export type EventStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'deleted';
export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  business_registration?: string;
  contact_email?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  description?: string;
  address?: string;
  district?: string;
  status: MerchantStatus;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
  color?: string;
  description?: string;
  display_order: number;
  created_at: string;
}

export interface District {
  id: string;
  name: string;
  name_en?: string;
  code: string;
  region?: string;
  created_at: string;
}

export interface Event {
  id: string;
  merchant_id: string;
  title: string;
  slug?: string;
  description?: string;
  category_id?: string;
  location?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  price_from?: number;
  price_to?: number;
  age_range_min?: number;
  age_range_max?: number;
  thumbnail_url?: string;
  images?: string[];
  status: EventStatus;
  published_at?: string;
  starts_at?: string;
  ends_at?: string;
  view_count: number;
  favorite_count: number;
  approval_notes?: string;
  source_url?: string;
  source_scrape_data?: any;
  created_at: string;
  updated_at: string;
}

export interface EventSchedule {
  id: string;
  event_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  capacity?: number;
  booked_count: number;
  notes?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  images?: string[];
  category_id?: string;
  location?: string;
  district?: string;
  status: PostStatus;
  views_count: number;
  likes_count: number;
  comments_count: number;
  moderated_by?: string;
  moderation_notes?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

export interface CommunityLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Approval {
  id: string;
  event_id?: string;
  post_id?: string;
  merchant_id?: string;
  admin_user_id: string;
  action: 'approved' | 'rejected' | 'suspended' | 'deleted';
  reason?: string;
  notes?: string;
  created_at: string;
}
