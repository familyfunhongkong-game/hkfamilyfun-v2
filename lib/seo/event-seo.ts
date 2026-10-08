import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

export type EventSeoRecord = {
  id: string;
  status?: string | null;
  title_tc?: string | null;
  title_sc?: string | null;
  title_en?: string | null;
  short_description_tc?: string | null;
  short_description_sc?: string | null;
  short_description_en?: string | null;
  description_tc?: string | null;
  description_sc?: string | null;
  description_en?: string | null;
  organizer_name?: string | null;
  merchant_name?: string | null;
  organizer_website?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  recurrence_type?: string | null;
  venue_name?: string | null;
  venue_name_tc?: string | null;
  venue_name_sc?: string | null;
  venue_name_en?: string | null;
  address?: string | null;
  address_tc?: string | null;
  address_sc?: string | null;
  address_en?: string | null;
  district?: string | null;
  cover_image_url?: string | null;
  price_type?: string | null;
  price_display_mode?: string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  is_free?: boolean | null;
  registration_url?: string | null;
  booking_url?: string | null;
  official_url?: string | null;
  source_url?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
};

const SITE_URL = "https://www.hkfamilyfun.com";
const FALLBACK_OG_IMAGE = `${SITE_URL}/api/brand/family-fun-logo`;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function httpUrl(value: unknown) {
  const valueText = text(value);
  return /^https?:\/\//i.test(valueText) ? valueText : "";
}

function makePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const getEventSeoData = cache(async (id: string): Promise<EventSeoRecord | null> => {
  if (!id) return null;

  const supabase = makePublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("public_events_i18n")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return data as EventSeoRecord;
});

export function canonicalEventUrl(id: string) {
  return `${SITE_URL}/events/${encodeURIComponent(id)}`;
}

export function getEventSeoTitle(event: EventSeoRecord) {
  return (
    text(event.title_tc) ||
    text(event.title_sc) ||
    text(event.title_en) ||
    "香港親子活動"
  );
}

export function getEventSeoDescription(event: EventSeoRecord) {
  const raw =
    text(event.short_description_tc) ||
    text(event.description_tc) ||
    text(event.short_description_sc) ||
    text(event.description_sc) ||
    text(event.short_description_en) ||
    text(event.description_en) ||
    "HK Family Fun 香港親子活動資料。";

  return raw.replace(/\s+/g, " ").slice(0, 180);
}

export function getEventSeoImage(event: EventSeoRecord) {
  return httpUrl(event.cover_image_url) || FALLBACK_OG_IMAGE;
}

export function getEventVenueName(event: EventSeoRecord) {
  return (
    text(event.venue_name_tc) ||
    text(event.venue_name) ||
    text(event.venue_name_sc) ||
    text(event.venue_name_en)
  );
}

export function getEventAddress(event: EventSeoRecord) {
  return (
    text(event.address_tc) ||
    text(event.address) ||
    text(event.address_sc) ||
    text(event.address_en)
  );
}

export function getEventOrganizerName(event: EventSeoRecord) {
  return text(event.organizer_name) || text(event.merchant_name);
}

function hongKongToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isEventExpired(event: EventSeoRecord) {
  const endDate = text(event.end_date) || text(event.start_date);
  const today = hongKongToday();
  return Boolean(endDate && today && endDate < today);
}

function isoHongKongDateTime(dateValue: unknown, timeValue: unknown) {
  const date = text(dateValue).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";

  const timeMatch = text(timeValue).match(/^(\d{2}):(\d{2})/);
  if (!timeMatch) return date;

  return `${date}T${timeMatch[1]}:${timeMatch[2]}:00+08:00`;
}

function numericPrice(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function registrationUrl(event: EventSeoRecord) {
  return httpUrl(event.registration_url) || httpUrl(event.booking_url);
}

export function buildEventJsonLd(event: EventSeoRecord) {
  if (isEventExpired(event)) return null;

  // Google recommends a unique Event item per performance/occurrence.
  // Until recurring occurrences have their own URLs, avoid emitting a
  // misleading single Event entity for an entire weekly series.
  if (text(event.recurrence_type).toLowerCase() === "weekly") return null;

  const name = getEventSeoTitle(event);
  const startDate = isoHongKongDateTime(event.start_date, event.start_time);
  const endDate = isoHongKongDateTime(
    event.end_date || event.start_date,
    event.end_time || event.start_time,
  );
  const venueName = getEventVenueName(event);
  const streetAddress = getEventAddress(event);

  // Google Event rich results require a real start date and physical
  // location. Do not invent either when merchant data is incomplete.
  if (!name || !startDate || !streetAddress) return null;

  const organizerName = getEventOrganizerName(event);
  const organizerUrl =
    httpUrl(event.organizer_website) ||
    httpUrl(event.official_url) ||
    httpUrl(event.source_url);
  const bookingUrl = registrationUrl(event);
  const isFree =
    Boolean(event.is_free) ||
    text(event.price_type).toLowerCase() === "free" ||
    text(event.price_display_mode).toLowerCase() === "free";
  const minPrice = numericPrice(event.min_price);
  const offerPrice = isFree ? 0 : minPrice;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description: getEventSeoDescription(event),
    startDate,
    ...(endDate ? { endDate } : {}),
    url: canonicalEventUrl(event.id),
    image: [getEventSeoImage(event)],
    location: {
      "@type": "Place",
      ...(venueName ? { name: venueName } : {}),
      address: {
        "@type": "PostalAddress",
        streetAddress,
        ...(text(event.district)
          ? { addressLocality: text(event.district) }
          : {}),
        addressRegion: "Hong Kong",
        addressCountry: "HK",
      },
    },
    isAccessibleForFree: isFree,
    ...(organizerName
      ? {
          organizer: {
            "@type": "Organization",
            name: organizerName,
            ...(organizerUrl ? { url: organizerUrl } : {}),
          },
        }
      : {}),
  };

  // Only emit Offer when the page has a genuine registration/booking URL
  // and the platform has a reliable numeric price. Never imply availability.
  if (bookingUrl && offerPrice !== null) {
    jsonLd.offers = {
      "@type": "Offer",
      url: bookingUrl,
      price: String(offerPrice),
      priceCurrency: "HKD",
    };
  }

  return jsonLd;
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
