export type PriceType = "free" | "paid";

export interface Event {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  date: string;
  endDate?: string;
  time: string;
  district: string;
  mtrStation: string;
  ageRange: string;
  organizer: string;
  tags: string[];
  category: string;
  priceType: PriceType;
  price?: string;
  senFriendly: boolean;
  image: string;
  officialLink?: string;
  featured?: boolean;
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
