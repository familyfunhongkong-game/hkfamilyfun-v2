import type { WeeklyOpeningHours } from "@/lib/events/weekly-opening-hours";

export type PriceType = "free" | "paid" | "mixed";

export interface Event {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  date: string;
  endDate?: string;
  recurrenceType?: "none" | "weekly";
  recurrenceWeekdays?: number[];
  recurrenceIncludeDates?: string[];
  recurrenceExcludeDates?: string[];
  recurrenceNote?: string;
  time: string;
  /** Original published time, used on one-off exception dates only. */
  defaultTime?: string;
  /** undefined=public timetable read unavailable; null=legacy; object=verified seven-day schedule. */
  weeklyOpeningHours?: WeeklyOpeningHours | null;
  district: string;
  venue?: string;
  mtrStation: string;
  ageRange: string;
  organizer: string;
  tags: string[];
  category: string;
  priceType: PriceType;
  price?: string;
  senFriendly: boolean;
  indoor?: boolean;
  image: string;
  coverImageOffsetX?: number;
  coverImageOffsetY?: number;
  coverImageZoom?: number;
  officialLink?: string;
  featured?: boolean;
  updatedAt?: string;
  publishedAt?: string;
  address?: string;
}

export interface EventFilters {
  keyword?: string;
  date?: string;
  district?: string;
  mtrStation?: string;
  ageGroup?: string;
  priceType?: PriceType | "";
  category?: string;
  senFriendly?: boolean;
}
