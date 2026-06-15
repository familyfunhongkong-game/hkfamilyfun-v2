import { z } from 'zod';

export const communityPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  category_id: z.string().uuid().optional(),
  location: z.string().optional(),
  district: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

export type CommunityPostFormData = z.infer<typeof communityPostSchema>;

export const commentSchema = z.object({
  content: z.string().min(2, 'Comment must be at least 2 characters').max(500),
});

export type CommentData = z.infer<typeof commentSchema>;
