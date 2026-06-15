import PostCard from './PostCard';
import type { CommunityPost } from '@/types';

interface CommunityFeedProps {
  posts: CommunityPost[];
  isLoading?: boolean;
  onLike?: (postId: string) => void;
  likedPosts?: Set<string>;
}

export default function CommunityFeed({
  posts,
  isLoading,
  onLike,
  likedPosts,
}: CommunityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No community posts yet. Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={onLike}
          liked={likedPosts?.has(post.id)}
        />
      ))}
    </div>
  );
}
