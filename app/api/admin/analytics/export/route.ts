import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 20000;
const PAGE_SIZE = 1000;
const HK_TIMEZONE = "Asia/Hong_Kong";

type AnalyticsEvent = {
  id: string;
  occurred_at: string;
  event_type: string;
  page_path: string;
  event_id: string | null;
  referrer_hostname: string | null;
  device_type: string;
};

type Summary = {
  totals?: {
    visitors?: number;
    sessions?: number;
    pageViews?: number;
    eventViews?: number;
    ctaClicks?: number;
  };
  trend?: Array<{
    date: string;
    visitors: number;
    sessions: number;
    pageViews: number;
    eventViews: number;
    ctaClicks: number;
  }>;
  topPages?: Array<{ path: string; views: number }>;
  topEvents?: Array<{
    id: string;
    title: string;
    category: string;
    district: string;
    views: number;
    clicks: number;
  }>;
  categories?: Array<{ label: string; views: number; clicks?: number }>;
  districts?: Array<{ label: string; views: number }>;
  devices?: Array<{ label: string; views: number }>;
  referrers?: Array<{ label: string; views: number }>;
};

// Prevent spreadsheet formula execution, including after whitespace, while
// preserving UTF-8 Traditional Chinese text for Excel/Sheets.
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) && typeof value === "string") {
    text = "'" + text;
  }
  return '"' + text.replace(/"/g, '""') + '"';
}

function csv(rows: Array<Array<string | number | null | undefined>>) {
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function localTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HK_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (name: string) => parts.find(p => p.type === name)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

function download(payload: string, name: string) {
  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function summaryCsv(summary: Summary, start: string, end: string) {
  const head = [
    "section", "date_or_label", "visitors", "sessions", "page_views",
    "event_views", "cta_clicks", "event_id", "category", "district",
  ];
  type Cell = string | number | null | undefined;
  const rows: Cell[][] = [
    head,
    ["report_start_utc", start],
    ["report_end_utc_exclusive", end],
    [
      "totals", "All selected dates", summary.totals?.visitors ?? 0,
      summary.totals?.sessions ?? 0, summary.totals?.pageViews ?? 0,
      summary.totals?.eventViews ?? 0, summary.totals?.ctaClicks ?? 0,
    ],
  ];
  for (const item of summary.trend || []) {
    rows.push(["daily_hk", item.date, item.visitors, item.sessions,
      item.pageViews, item.eventViews, item.ctaClicks]);
  }
  for (const item of summary.topPages || []) {
    rows.push(["top_page", item.path, null, null, item.views]);
  }
  for (const item of summary.topEvents || []) {
    rows.push(["top_event", item.title, null, null, null, item.views, item.clicks,
      item.id, item.category, item.district]);
  }
  for (const item of summary.categories || []) {
    rows.push(["category", item.label, null, null, null, item.views, item.clicks]);
  }
  for (const item of summary.districts || []) {
    rows.push(["district", item.label, null, null, null, item.views]);
  }
  for (const item of summary.devices || []) {
    rows.push(["device", item.label, null, null, item.views]);
  }
  for (const item of summary.referrers || []) {
    rows.push(["referrer", item.label, null, null, item.views]);
  }
  return csv(rows);
}

function eventCsv(events: AnalyticsEvent[]) {
  const rows: Array<Array<string | number | null | undefined>> = [[
    "occurred_at_hong_kong", "occurred_at_utc", "event_type",
    "page_path", "event_id", "referrer_hostname", "device_type",
  ]];
  for (const item of events) {
    rows.push([
      localTime(item.occurred_at),
      item.occurred_at,
      item.event_type,
      item.page_path,
      item.event_id,
      item.referrer_hostname,
      item.device_type,
    ]);
  }
  return csv(rows);
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const admin = await requireAdmin(token);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const mode = request.nextUrl.searchParams.get("type");
  if (mode !== "events" && mode !== "summary") {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  const startText = request.nextUrl.searchParams.get("start") || "";
  const endText = request.nextUrl.searchParams.get("end") || "";
  const start = new Date(startText);
  const end = endText ? new Date(endText) : new Date();
  if (!startText || !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end.getTime() <= start.getTime() ||
      end.getTime() - start.getTime() > 367 * 86400000 ||
      end.getTime() > Date.now() + 60000) {
    return NextResponse.json({ error: "請選擇最多 367 日的有效報表期間。" }, { status: 400 });
  }

  const client = serviceClient();
  if (!client) {
    return NextResponse.json({ error: "Analytics service unavailable" }, { status: 503 });
  }

  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: HK_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).replace(/\//g, "-");
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  if (mode === "summary") {
    const { data, error } = await client.rpc("admin_site_analytics_summary", {
      p_start: startIso,
    });
    if (error) {
      console.error("Admin Analytics export summary failed", error.message);
      return NextResponse.json({ error: "未能匯出流量摘要。" }, { status: 503 });
    }
    // Summary RPC uses a start-only filter. The standard admin range exports
    // always end at now, matching the admin dashboard's own summary.
    if (endText) {
      return NextResponse.json({ error: "流量摘要只支援截至目前的報表。" }, { status: 400 });
    }
    return download(
      summaryCsv((data || {}) as Summary, startIso, endIso),
      `hkff-analytics-summary-${stamp}.csv`,
    );
  }

  const rows: AnalyticsEvent[] = [];
  for (let offset = 0; offset <= MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await client.from("site_analytics_events")
      .select("id,occurred_at,event_type,page_path,event_id,referrer_hostname,device_type")
      .gte("occurred_at", startIso)
      .lt("occurred_at", endIso)
      .order("occurred_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error("Admin Analytics export events failed", error.message);
      return NextResponse.json({ error: "未能匯出詳細事件。" }, { status: 503 });
    }
    const batch = (data || []) as AnalyticsEvent[];
    rows.push(...batch);
    if (rows.length > MAX_ROWS) {
      return NextResponse.json({
        error: "選定期間超過 20,000 筆紀錄，請縮短日期範圍再匯出，避免漏數。",
      }, { status: 413 });
    }
    if (batch.length < PAGE_SIZE) break;
  }

  return download(
    eventCsv(rows),
    `hkff-site-analytics-events-${stamp}.csv`,
  );
}
