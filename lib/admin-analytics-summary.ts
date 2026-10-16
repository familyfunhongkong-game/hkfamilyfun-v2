import type { SupabaseClient } from "@supabase/supabase-js";

// PostgREST only grants the legacy summary RPC to service_role, while its
// internal is_platform_admin() checks for an end-user JWT. That combination
// always denies service-role calls. Aggregate server-side after requireAdmin
// has authorized the caller, without changing production SQL privileges.
//
// The limit is deliberate: return an explicit error rather than silently
// summarizing only the first 1,000 rows or timing out on huge datasets.
export const ANALYTICS_REPORT_LIMIT = 20000;
const PAGE_SIZE = 1000;
const HK_TIMEZONE = "Asia/Hong_Kong";

type RawAnalytics = {
  visitor_id: string;
  session_id: string;
  event_type: string;
  page_path: string;
  event_id: string | null;
  occurred_at: string;
  referrer_hostname: string | null;
  device_type: string;
};
type EventMetadata = {
  id: string;
  title_tc: string | null;
  title: string | null;
  activity_category: string | null;
  category: string | null;
  district: string | null;
};

export class AnalyticsReportLimitError extends Error {
  constructor() {
    super("選定日期超過 20,000 筆 Analytics 事件，請縮短日期範圍。");
    this.name = "AnalyticsReportLimitError";
  }
}

function hkDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HK_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find(p => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function sortCounts(values: Map<string, number>, limit = 12) {
  return [...values].map(([label, views]) => ({ label, views }))
    .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label))
    .slice(0, limit);
}
function increase(map: Map<string, number>, key: string, value = 1) {
  map.set(key, (map.get(key) || 0) + value);
}

export async function getSiteAnalyticsSummary(
  client: SupabaseClient,
  startIso: string,
) {
  const rows: RawAnalytics[] = [];
  for (let offset = 0; offset <= ANALYTICS_REPORT_LIMIT; offset += PAGE_SIZE) {
    const { data, error } = await client.from("site_analytics_events")
      .select("visitor_id,session_id,event_type,page_path,event_id,occurred_at,referrer_hostname,device_type")
      .gte("occurred_at", startIso)
      .order("occurred_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data || []) as RawAnalytics[];
    rows.push(...batch);
    if (rows.length > ANALYTICS_REPORT_LIMIT) throw new AnalyticsReportLimitError();
    if (batch.length < PAGE_SIZE) break;
  }

  const eventIds = [...new Set(rows.map(r => r.event_id).filter((id): id is string => Boolean(id)))];
  const metadata = new Map<string, EventMetadata>();
  for (let offset = 0; offset < eventIds.length; offset += 100) {
    const { data, error } = await client.from("events")
      .select("id,title_tc,title,activity_category,category,district")
      .in("id", eventIds.slice(offset, offset + 100));
    if (error) throw error;
    for (const event of (data || []) as EventMetadata[]) metadata.set(event.id, event);
  }

  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const pages = new Map<string, number>();
  const devices = new Map<string, number>();
  const referrers = new Map<string, number>();
  const categories = new Map<string, { views: number; clicks: number }>();
  const districts = new Map<string, number>();
  const events = new Map<string, { id: string; title: string; category: string; district: string; views: number; clicks: number }>();
  const days = new Map<string, {
    visitors: Set<string>;
    sessions: Set<string>;
    pageViews: number;
    eventViews: number;
    ctaClicks: number;
  }>();

  let pageViews = 0;
  let eventViews = 0;
  let ctaClicks = 0;
  for (const row of rows) {
    visitors.add(row.visitor_id);
    sessions.add(row.session_id);
    const day = hkDate(row.occurred_at);
    if (!days.has(day)) {
      days.set(day, {
        visitors: new Set(), sessions: new Set(),
        pageViews: 0, eventViews: 0, ctaClicks: 0,
      });
    }
    const bucket = days.get(day)!;
    bucket.visitors.add(row.visitor_id);
    bucket.sessions.add(row.session_id);

    if (row.event_type === "page_view") {
      pageViews++;
      bucket.pageViews++;
      increase(pages, row.page_path);
      increase(devices, row.device_type || "unknown");
      increase(referrers, row.referrer_hostname || "Direct");
    }
    if (row.event_type === "event_view") {
      eventViews++;
      bucket.eventViews++;
    }
    if (row.event_type === "cta_click") {
      ctaClicks++;
      bucket.ctaClicks++;
    }
    if (!row.event_id || !["event_view", "cta_click"].includes(row.event_type)) continue;
    const info = metadata.get(row.event_id);
    // The old SQL summary joins events: orphaned event IDs are not categorized.
    if (!info) continue;
    const category = info.activity_category || info.category || "未分類";
    const district = info.district || "未分類";
    const event = events.get(row.event_id) || {
      id: row.event_id,
      title: info.title_tc || info.title || "未命名活動",
      category, district, views: 0, clicks: 0,
    };
    if (row.event_type === "event_view") {
      event.views++;
      increase(districts, district);
    } else {
      event.clicks++;
    }
    const cat = categories.get(category) || { views: 0, clicks: 0 };
    if (row.event_type === "event_view") cat.views++;
    else cat.clicks++;
    categories.set(category, cat);
    events.set(row.event_id, event);
  }

  return {
    totals: {
      visitors: visitors.size, sessions: sessions.size,
      pageViews, eventViews, ctaClicks,
    },
    trend: [...days].sort(([a], [b]) => a.localeCompare(b))
      .map(([date, item]) => ({
        date, visitors: item.visitors.size, sessions: item.sessions.size,
        pageViews: item.pageViews, eventViews: item.eventViews, ctaClicks: item.ctaClicks,
      })),
    topPages: sortCounts(pages).map(item => ({ path: item.label, views: item.views })),
    topEvents: [...events.values()]
      .sort((a, b) => b.views - a.views || b.clicks - a.clicks)
      .slice(0, 12),
    categories: [...categories].map(([label, item]) => ({ label, ...item }))
      .sort((a, b) => b.views - a.views).slice(0, 12),
    districts: sortCounts(districts),
    devices: sortCounts(devices, 100),
    referrers: sortCounts(referrers),
  };
}
