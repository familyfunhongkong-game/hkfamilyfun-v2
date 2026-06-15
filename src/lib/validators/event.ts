import { z } from 'zod';

export const eventFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category_id: z.string().uuid('Invalid category'),
  location: z.string().min(2, 'Location is required'),
  district: z.string().min(2, 'District is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  price_from: z.number().min(0).optional(),
  price_to: z.number().min(0).optional(),
  age_range_min: z.number().min(0).max(120).optional(),
  age_range_max: z.number().min(0).max(120).optional(),
  thumbnail_url: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
});

export type EventFormData = z.infer<typeof eventFormSchema>;

export const eventScheduleSchema = z.object({
  date: z.string().date(),
  start_time: z.string().time().optional(),
  end_time: z.string().time().optional(),
  capacity: z.number().min(1).optional(),
});

export type EventScheduleData = z.infer<typeof eventScheduleSchema>;
