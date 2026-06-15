'use client';

import { useEffect, useState } from 'react';
import CommunityFeed from '@/components/community/CommunityFeed';
import { getApprovedPosts } from '@/lib/api/community';
import { supabase } from '@/lib/supabase';
import type { CommunityPost } from '@/types';
import Link from 'next/link';
import Button from '@/components/common/Button';

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const postsData = await getApprovedPosts({ limit: 50 });
        setPosts(postsData);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  const handleLike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      if (likedPosts.has(postId)) {
        await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        await supabase
          .from('community_post_likes')
          .insert([{ post_id: postId, user_id: user.id }]);
        setLikedPosts(prev => new Set([...prev, postId]));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">Community</h1>
          <p className="text-gray-600 text-lg">Share your family activity experiences and discover what other families love</p>
        </div>
        <Link href="/community/create">
          <Button size="lg">Share a Story</Button>
        </Link>
      </div>

      <CommunityFeed
        posts={posts}
        isLoading={isLoading}
        onLike={handleLike}
        likedPosts={likedPosts}
      />
    </div>
  );
}
