'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Send } from 'lucide-react';
import type { CommunityPost } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: CommunityPost;
  author?: { name?: string; avatar_url?: string };
  onLike?: (postId: string) => void;
  liked?: boolean;
}

export default function PostCard({ post, author, onLike, liked }: PostCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{author?.name || 'Anonymous'}</h3>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <Link href={`/community/${post.id}`}>
        <h2 className="text-lg font-bold text-gray-900 mb-2 hover:text-primary-600">
          {post.title}
        </h2>
        <p className="text-gray-700 line-clamp-3 mb-4">{post.content}</p>
      </Link>

      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {post.images.slice(0, 3).map((img, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 rounded-lg overflow-hidden"
            >
              <img
                src={img}
                alt={`Post image ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex space-x-4">
          <button
            onClick={() => onLike?.(post.id)}
            className={`flex items-center space-x-1 transition ${
              liked
                ? 'text-primary-600 font-medium'
                : 'hover:text-primary-600'
            }`}
          >
            <span>❤️</span>
            <span>{post.likes_count}</span>
          </button>
          <Link href={`/community/${post.id}`} className="flex items-center space-x-1 hover:text-primary-600">
            <Send className="w-4 h-4" />
            <span>{post.comments_count}</span>
          </Link>
        </div>
        <Link href={`/community/${post.id}`} className="font-medium text-primary-600 hover:text-primary-700">
          Read More
        </Link>
      </div>
    </div>
  );
}
